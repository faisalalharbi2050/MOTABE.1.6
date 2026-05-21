import React from 'react';
import { SchoolInfo, Phase } from '../../types';
import { School, Building2, Check } from 'lucide-react';

interface SchoolTabsProps {
  schoolInfo: SchoolInfo;
  activeSchoolId: string; // 'main' for main school, or sharedSchool.id
  onTabChange: (schoolId: string) => void;
  children?: React.ReactNode;
}

const SchoolTabs: React.FC<SchoolTabsProps> = ({ schoolInfo, activeSchoolId, onTabChange, children }) => {
  const sharedSchools = schoolInfo?.sharedSchools || [];
  const tabBaseClass = 'group relative flex min-w-[240px] items-start gap-3 overflow-hidden rounded-xl border px-4 py-3 pr-5 text-right text-sm font-bold transition-all active:scale-[0.98]';
  const inactiveTabClass = 'border-slate-200 bg-white text-slate-700 hover:-translate-y-0.5 hover:border-[#c8bff8] hover:shadow-sm';
  const activeTabClass = 'border-slate-300 bg-white text-slate-800 shadow-md shadow-[#655ac1]/10';
  const chipBaseClass = 'rounded-md border px-2 py-0.5 text-[10px] font-black whitespace-nowrap';
  const inactiveChipClass = 'border-slate-200 bg-white text-slate-500';
  const activeChipClass = inactiveChipClass;

  // If no shared schools AND no children, don't render anything
  if ((!sharedSchools || sharedSchools.length === 0) && !children) {
    return null;
  }

  const renderPhaseChips = (
    phases: Phase[] | undefined,
    otherPhase?: string,
    isActive = false
  ) => (
    <div className="flex max-w-[210px] flex-wrap items-center gap-1.5">
      {(phases || []).map(p => (
        <span key={p} className={`${chipBaseClass} ${isActive ? activeChipClass : inactiveChipClass}`}>
          {p === Phase.OTHER && otherPhase ? otherPhase : p}
        </span>
      ))}
    </div>
  );

  return (
    <div className="mb-6 flex flex-wrap gap-3">
      <button
        onClick={() => onTabChange('main')}
        className={`${tabBaseClass} ${activeSchoolId === 'main' ? activeTabClass : inactiveTabClass}`}
      >
        {activeSchoolId === 'main' && (
          <>
            <span className="absolute right-0 top-0 h-full w-1.5 bg-[#655ac1]" />
            <span className="absolute left-3 top-3 flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-br from-[#7c6ee0] to-[#655ac1] shadow-sm shadow-[#655ac1]/30">
              <Check size={12} strokeWidth={3.5} className="text-white" />
            </span>
          </>
        )}
        <School
          size={22}
          strokeWidth={1.9}
          className="mt-0.5 shrink-0 text-[#655ac1]"
        />
        <div className="flex min-w-0 flex-1 flex-col items-start gap-2">
          <span className="max-w-[190px] truncate text-sm font-black text-slate-800 group-hover:text-[#655ac1]">
            {schoolInfo?.schoolName || 'المدرسة الرئيسية'}
          </span>
          <div className="flex max-w-[210px] flex-wrap items-center gap-1.5">
            <span className={`${chipBaseClass} ${activeSchoolId === 'main' ? activeChipClass : inactiveChipClass}`}>
              أساسية
            </span>
            {renderPhaseChips(schoolInfo?.phases, schoolInfo?.otherPhase, activeSchoolId === 'main')}
          </div>
        </div>
      </button>

      {sharedSchools.map((school) => {
        const isActive = activeSchoolId === school.id;

        return (
          <button
            key={school.id}
            onClick={() => onTabChange(school.id)}
            className={`${tabBaseClass} ${isActive ? activeTabClass : inactiveTabClass}`}
          >
            {isActive && (
              <>
                <span className="absolute right-0 top-0 h-full w-1.5 bg-[#655ac1]" />
                <span className="absolute left-3 top-3 flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-br from-[#7c6ee0] to-[#655ac1] shadow-sm shadow-[#655ac1]/30">
                  <Check size={12} strokeWidth={3.5} className="text-white" />
                </span>
              </>
            )}
            <Building2
              size={22}
              strokeWidth={1.9}
              className="mt-0.5 shrink-0 text-[#655ac1]"
            />
            <div className="flex min-w-0 flex-1 flex-col items-start gap-2">
              <span className="max-w-[190px] truncate text-sm font-black text-slate-800 group-hover:text-[#655ac1]">
                {school.name}
              </span>
              <div className="flex max-w-[210px] flex-wrap items-center gap-1.5">
                <span className={`${chipBaseClass} ${isActive ? activeChipClass : inactiveChipClass}`}>
                  مشتركة
                </span>
                {renderPhaseChips(school.phases, school.otherPhase, isActive)}
              </div>
            </div>
          </button>
        );
      })}

      {children}
    </div>
  );
};

export default SchoolTabs;
