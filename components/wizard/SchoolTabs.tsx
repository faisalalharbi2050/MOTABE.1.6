import React from 'react';
import { SchoolInfo, SharedSchool, Phase } from '../../types';
import { School, Building2 } from 'lucide-react';

interface SchoolTabsProps {
  schoolInfo: SchoolInfo;
  activeSchoolId: string; // 'main' for main school, or sharedSchool.id
  onTabChange: (schoolId: string) => void;
  children?: React.ReactNode;
}

const SchoolTabs: React.FC<SchoolTabsProps> = ({ schoolInfo, activeSchoolId, onTabChange, children }) => {
  const sharedSchools = schoolInfo?.sharedSchools || [];

  // If no shared schools AND no children, don't render anything
  if ((!sharedSchools || sharedSchools.length === 0) && !children) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-2 mb-6 p-1 bg-slate-100/50 rounded-xl border border-slate-200">
      <button
        onClick={() => onTabChange('main')}
        className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all border ${
          activeSchoolId === 'main'
            ? 'bg-white text-primary border-primary/20 shadow-sm ring-1 ring-primary/10'
            : 'text-slate-500 hover:text-slate-700 hover:bg-white/50 border-transparent hover:border-slate-200'
        }`}
      >
        <div className={`p-2 rounded-lg ${activeSchoolId === 'main' ? 'bg-primary/10 text-primary' : 'bg-slate-100 text-slate-400'}`}>
           <School size={18} />
        </div>
        <div className="flex flex-col items-start gap-0.5">
            <span>{schoolInfo?.schoolName || 'المدرسة الرئيسية'}</span>
            <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-medium opacity-80">
                {(schoolInfo?.phases || []).map(p => (
                    <span key={p} className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-500 whitespace-nowrap">
                        {p === Phase.OTHER && schoolInfo?.otherPhase ? schoolInfo.otherPhase : p}
                    </span>
                ))}
                {(schoolInfo?.departments || []).map(d => (
                    <span key={d} className="bg-slate-50 px-1.5 py-0.5 rounded text-slate-400 border border-slate-100 whitespace-nowrap">
                        {d.endsWith('-other') && schoolInfo?.otherDepartment ? schoolInfo.otherDepartment : d.split('-').pop()}
                    </span>
                ))}
            </div>
        </div>
        {activeSchoolId === 'main' && <span className="w-2 h-2 rounded-full bg-emerald-500"></span>}
      </button>

      {sharedSchools.map((school) => (
        <button
          key={school.id}
          onClick={() => onTabChange(school.id)}
          className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all border ${
            activeSchoolId === school.id
              ? 'bg-white text-[#655ac1] border-[#c8bff8] shadow-sm ring-1 ring-[#e5e1fe]'
              : 'text-slate-500 hover:text-slate-700 hover:bg-white/50 border-transparent hover:border-slate-200'
          }`}
        >
          <div className={`p-2 rounded-lg ${activeSchoolId === school.id ? 'bg-[#e5e1fe] text-[#655ac1]' : 'bg-slate-100 text-slate-400'}`}>
             <Building2 size={18} />
          </div>
          <div className="flex flex-col items-start gap-0.5">
             <span>{school.name}</span>
             <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-medium opacity-80">
                {(school.phases || []).map(p => (
                    <span key={p} className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-500 whitespace-nowrap">
                        {p === Phase.OTHER && school.otherPhase ? school.otherPhase : p}
                    </span>
                ))}
                {(school.departments || []).map(d => (
                    <span key={d} className="bg-slate-50 px-1.5 py-0.5 rounded text-slate-400 border border-slate-100 whitespace-nowrap">
                        {d.endsWith('-other') && school.otherDepartment ? school.otherDepartment : d.split('-').pop()}
                    </span>
                ))}
             </div>
          </div>
          {activeSchoolId === school.id && <span className="w-2 h-2 rounded-full bg-[#8779fb]"></span>}
        </button>
      ))}
      
      {children}
    </div>
  );
};

export default SchoolTabs;
