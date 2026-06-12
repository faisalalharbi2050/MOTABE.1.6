import React from 'react';
import { PackageTier } from '../../types';
import { FeatureGroup, PACKAGE_NAMES, PACKAGE_DESCRIPTIONS, PLAN_WHY } from './packages';
import { FEATURE_ICONS } from './featureIcons';
import { ArrowRight, ArrowLeft, Check, Sparkles } from 'lucide-react';

interface PlanFeaturesPageProps {
  tier: PackageTier;
  groups: FeatureGroup[];
  onBack: () => void;
  onSubscribe: () => void;
}

const PlanFeaturesPage: React.FC<PlanFeaturesPageProps> = ({
  tier, groups, onBack, onSubscribe,
}) => {
  return (
    <div className="animate-fade-in space-y-5 pb-24">

      {/* ── Brand header (compact bar matching the receipt-log pages) ── */}
      <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-5">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={onBack}
            title="رجوع"
            className="inline-flex items-center justify-center w-11 h-11 rounded-xl border border-slate-200 bg-white text-slate-600 hover:border-[#655ac1] hover:text-[#655ac1] hover:bg-slate-50 transition-all"
          >
            <ArrowRight size={18} />
          </button>
          <div className="min-w-0">
            <h2 className="font-black text-[#655ac1] text-lg">{PACKAGE_NAMES[tier]}</h2>
            <p className="text-xs text-slate-500 font-medium mt-0.5 truncate">{PACKAGE_DESCRIPTIONS[tier]}</p>
          </div>
        </div>
      </div>

      {/* ── Feature groups (one airy container, dividers not boxes) ── */}
      <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm p-8 sm:p-9">
        {groups.map((group, gIdx) => {
          const GroupIcon = FEATURE_ICONS[group.iconKey];
          return (
            <div key={group.id} className={gIdx > 0 ? 'mt-8 pt-8 border-t border-slate-100' : ''}>
              <div className="flex items-center gap-3 mb-4">
                <GroupIcon size={22} className="text-[#655ac1] shrink-0" strokeWidth={2} />
                <h3 className="text-base font-black text-[#655ac1] leading-tight">{group.title}</h3>
              </div>
              <div className="flex flex-col gap-3 pr-9">
                {group.features.map((feat, idx) => (
                  <div key={idx} className="flex items-center gap-2.5">
                    <div className="w-[18px] h-[18px] rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-sm shadow-emerald-500/30 shrink-0">
                      <Check size={11} strokeWidth={3.5} className="text-white" />
                    </div>
                    <span className="font-bold text-sm text-slate-600 leading-relaxed">{feat}</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Why this package ── */}
      <div className="rounded-[2rem] border border-slate-300 bg-white p-8">
        <h3 className="flex items-center gap-2 text-lg font-black text-[#655ac1] mb-3">
          <Sparkles size={20} /> {PLAN_WHY.title}
        </h3>
        <p className="text-sm text-slate-600 font-bold leading-loose mb-5">{PLAN_WHY.intro}</p>
        <div className="flex flex-col gap-3">
          {PLAN_WHY.points.map((p, idx) => (
            <div key={idx} className="flex items-center gap-2.5">
              <div className="w-[18px] h-[18px] rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-sm shadow-emerald-500/30 shrink-0">
                <Check size={11} strokeWidth={3.5} className="text-white" />
              </div>
              <span className="font-bold text-sm text-slate-700">{p}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Sticky subscribe bar ── */}
      <div className="sticky bottom-4 z-10">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-lg shadow-slate-200/70 p-3 flex items-center justify-between gap-3">
          <p className="text-sm font-black text-slate-700 pr-2 hidden sm:block">{PLAN_WHY.closing}</p>
          <button
            onClick={onSubscribe}
            className="flex items-center justify-center gap-2 py-3.5 px-8 bg-[#655ac1] text-white rounded-xl font-black text-base shadow-lg shadow-indigo-200 hover:opacity-90 hover:shadow-xl active:scale-[0.99] transition-all w-full sm:w-auto"
          >
            إضافة للسلة <ArrowLeft size={18} strokeWidth={2.5} />
          </button>
        </div>
      </div>

    </div>
  );
};

export default PlanFeaturesPage;
