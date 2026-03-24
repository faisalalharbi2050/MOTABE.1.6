import React, { useMemo } from 'react';
import { Teacher, SubstitutionConfig } from '../../types';
import { Clock, Zap, ArrowLeftRight, Check, AlertTriangle, Info, GripHorizontal } from 'lucide-react';
import { calculateSubstitutionBalance, ValidationWarning } from '../../utils/scheduleConstraints';

interface Props {
  teachers: Teacher[];
  config: SubstitutionConfig;
  weekDays: number;
  periodsPerDay: number;
  warnings: ValidationWarning[];
  onChange: (c: SubstitutionConfig) => void;
}

export default function SubstitutionTab({ teachers, config, weekDays, periodsPerDay, warnings, onChange }: Props) {
  const totalWeeklyPeriods = weekDays * periodsPerDay;

  const balance = useMemo(() =>
    calculateSubstitutionBalance(teachers, config.maxTotalQuota, totalWeeklyPeriods, config.fixedPerPeriod || 0),
    [teachers, config.maxTotalQuota, totalWeeklyPeriods, config.fixedPerPeriod]
  );

  const methods = [
    { id: 'auto' as const, label: 'التوزيع التلقائي', desc: 'ملء فراغات المعلمين تلقائياً بنصاب الانتظار المحدد', icon: Zap, gradient: 'from-emerald-500 to-teal-600' },
    { id: 'fixed' as const, label: 'التوزيع المحدد', desc: 'عدد ثابت من المنتظرين لكل حصة', icon: ArrowLeftRight, gradient: 'from-blue-500 to-indigo-600' },
    { id: 'manual' as const, label: 'التوزيع اليدوي', desc: 'إنشاء حصص الانتظار بشكل يدوي لكل معلم', icon: GripHorizontal, gradient: 'from-[#655ac1] to-[#8779fb]' },
  ];

  return (
    <div className="space-y-8">
      {/* ─── Info Note ─── */}
      <div className="bg-white rounded-2xl border-2 border-slate-200 p-5 flex items-start gap-3">
        <div className="w-9 h-9 rounded-lg bg-white border border-slate-300 flex items-center justify-center shrink-0">
          <Info size={16} className="text-[#8779fb]" />
        </div>
        <div>
          <p className="text-sm font-bold text-slate-700">إعدادات ما قبل إنشاء حصص الانتظار</p>
          <ul className="text-xs text-slate-500 mt-2 space-y-1.5 list-none">
            <li className="flex items-start gap-1.5">
              <span className="text-slate-400 mt-0.5">•</span>
              <span>بعد اختيار طريقة التوزيع سيتم توزيع حصص الانتظار بالنقر على زر <span className="font-black text-[#655ac1]">"إنشاء حصص الانتظار"</span> بعد قفل جدول الحصص.</span>
            </li>
            <li className="flex items-start gap-1.5">
              <span className="text-slate-400 mt-0.5">•</span>
              <span>في التوزيع اليدوي يمكنك توزيع حصص الانتظار بشكل يدوي وفق رغبتك.</span>
            </li>
            <li className="flex items-start gap-1.5">
              <span className="text-slate-400 mt-0.5">•</span>
              <span>يُرمز للانتظار بـ <span className="font-black bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded border border-slate-300 mx-0.5">م</span> &gt; انتظار.</span>
            </li>
          </ul>
        </div>
      </div>

      {/* ─── Global Config ─── */}
      <div className="relative">
        <div className="absolute -inset-1 bg-gradient-to-br from-[#655ac1]/10 to-[#8779fb]/10 rounded-[2rem] blur-xl" />
        <div className="relative bg-white/80 backdrop-blur-sm rounded-[1.75rem] border border-[#8779fb]/20 p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-xl bg-white border border-slate-300 flex items-center justify-center">
              <Clock size={18} className="text-[#8779fb]" />
            </div>
            <h3 className="font-black text-slate-800">إعدادات عامة</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-500 uppercase tracking-wide">الحد الأقصى للنصاب (أساسي + انتظار)</label>
              <div className="relative">
                <input type="number" min={1} max={40} value={config.maxTotalQuota}
                  onChange={e => onChange({ ...config, maxTotalQuota: Number(e.target.value) })}
                  className="w-full bg-white border-2 border-slate-200 rounded-xl pr-4 pl-20 py-3 text-sm font-bold focus:ring-2 focus:ring-[#8779fb]/30 focus:border-[#655ac1] outline-none transition-all" />
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[11px] font-bold text-slate-400 pointer-events-none border-r border-slate-200 pl-2">حصة/أسبوع</span>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-500 uppercase tracking-wide">الحد الأقصى اليومي (أساسي + انتظار)</label>
              <div className="relative">
                <input type="number" min={1} max={10} value={config.maxDailyTotal}
                  onChange={e => onChange({ ...config, maxDailyTotal: Number(e.target.value) })}
                  className="w-full bg-white border-2 border-slate-200 rounded-xl pr-4 pl-20 py-3 text-sm font-bold focus:ring-2 focus:ring-[#8779fb]/30 focus:border-[#655ac1] outline-none transition-all" />
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[11px] font-bold text-slate-400 pointer-events-none border-r border-slate-200 pl-2">حصة/انتظار</span>
              </div>
            </div>
          </div>
          <p className="mt-3 text-[11px] text-slate-400 font-medium flex items-center gap-1.5">
            <Info size={12} className="text-[#8779fb] shrink-0" />
            يمكنك تغيير هذه الإعدادات ولكن الأفضل إبقاءها كما هي مراعاةً للعبء التدريسي للمعلم
          </p>
        </div>
      </div>

      {/* ─── Method Selection ─── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {methods.map(m => {
          const isSelected = config.method === m.id;
          const colorMap: Record<string, { bg: string; border: string; iconBg: string; radioBorder: string; radioFill: string; textColor: string; shadowColor: string }> = {
            auto:   { bg: 'bg-emerald-50',    border: 'border-emerald-500',  iconBg: 'from-emerald-500 to-teal-600',   radioBorder: 'border-emerald-500',  radioFill: 'bg-emerald-500',   textColor: 'text-emerald-700',   shadowColor: 'shadow-emerald-100' },
            fixed:  { bg: 'bg-blue-50',       border: 'border-blue-500',     iconBg: 'from-blue-500 to-indigo-600',    radioBorder: 'border-blue-500',     radioFill: 'bg-blue-500',      textColor: 'text-blue-700',      shadowColor: 'shadow-blue-100'   },
            manual: { bg: 'bg-[#e5e1fe]/60',  border: 'border-[#655ac1]',    iconBg: 'from-[#655ac1] to-[#8779fb]',   radioBorder: 'border-[#655ac1]',    radioFill: 'bg-[#655ac1]',     textColor: 'text-[#655ac1]',     shadowColor: 'shadow-[#655ac1]/10' },
          };
          const c = colorMap[m.id];
          return (
            <button key={m.id} onClick={() => onChange({ ...config, method: m.id })}
              className={`relative p-5 rounded-2xl border-2 text-right transition-all duration-200 bg-white ${
                isSelected
                  ? `${c.border} shadow-lg ${c.shadowColor}`
                  : 'border-slate-200 hover:border-slate-300 hover:shadow-md'
              }`}>
              {/* Radio indicator — top left (RTL) */}
              <div className={`absolute top-4 left-4 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all duration-200 ${
                isSelected ? `${c.radioBorder} bg-white` : 'border-slate-300 bg-white'
              }`}>
                {isSelected && <div className={`w-2.5 h-2.5 rounded-full ${c.radioFill}`} />}
              </div>
              {/* Icon + Label — centered */}
              <div className="flex flex-col items-center gap-2 py-2">
                <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${c.iconBg} flex items-center justify-center transition-all duration-200 ${isSelected ? 'shadow-md' : 'shadow-sm opacity-75'}`}>
                  <m.icon size={17} className="text-white" />
                </div>
                <h4 className={`font-black text-sm transition-colors duration-200 ${isSelected ? c.textColor : 'text-slate-600'}`}>
                  {m.label}
                </h4>
              </div>
            </button>
          );
        })}
      </div>

      {/* ─── Method Details ─── */}
      {config.method === 'auto' && (
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-4">
            <div className="flex justify-center">
              <div className="w-0 h-0 border-l-[8px] border-r-[8px] border-t-[8px] border-l-transparent border-r-transparent border-t-[#8779fb]" />
            </div>
            <div /><div />
          </div>
        <div className="px-2 space-y-2">
          {[
            `ملء فراغات المعلمين في جداولهم تلقائياً بنصاب الانتظار المحدد لهم مسبقًا`,
            `الحد الأقصى اليومي في التوزيع ${config.maxDailyTotal} حصص تشمل (مواد + انتظار)`,
            'توزيع الانتظار للمعلم على أيام الأسبوع في الحصص الأولى والوسطى والأخيرة',
          ].map((text, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="text-[#8779fb] font-black text-lg leading-none">•</span>
              <span className="text-sm text-slate-500 font-medium">{text}</span>
            </div>
          ))}
        </div>
        </div>
      )}

      {config.method === 'fixed' && (
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-4">
            <div />
            <div className="flex justify-center">
              <div className="w-0 h-0 border-l-[8px] border-r-[8px] border-t-[8px] border-l-transparent border-r-transparent border-t-[#8779fb]" />
            </div>
            <div />
          </div>
          <div className="space-y-5">
          <div className="px-2 space-y-2">
            {[
              'حدد عدد المنتظرين لكل حصة',
              `تغطية كل حصة بعدد ${config.fixedPerPeriod || 'X'} منتظرين بشكل ثابت`,
              'توزيع حصص الانتظار للمعلم بناءً على الفراغات المتاحة',
              'تنبيه فوري في حال وجود عجز في عدد المعلمين لتغطية العدد المحدد',
            ].map((text, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="text-[#8779fb] font-black text-lg leading-none">•</span>
                <span className="text-sm text-slate-500 font-medium">{text}</span>
              </div>
            ))}
          </div>
          <div className="space-y-2 px-2">
            <label className="text-sm font-black text-slate-700">عدد المنتظرين لكل حصة</label>
            <input type="number" min={1} max={20} value={config.fixedPerPeriod || ''}
              onChange={e => onChange({ ...config, fixedPerPeriod: Number(e.target.value) })}
              placeholder="مثال: 5"
              className="w-64 bg-white border-2 border-slate-200 rounded-xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-blue-200 focus:border-blue-400 outline-none transition-all" />
          </div>
          {config.fixedPerPeriod && config.fixedPerPeriod > 0 && (
            <div className={`rounded-2xl p-5 border-2 ${balance.deficit > 0 ? 'bg-red-50 border-red-200 shadow-sm' : 'bg-emerald-50 border-emerald-200 shadow-sm'}`}>
              <div className="flex items-center gap-2 mb-4">
                {balance.deficit > 0 ? <AlertTriangle className="text-red-500" size={20} /> : <Check className="text-emerald-500" size={20} />}
                <span className="font-black text-base">{balance.deficit > 0 ? 'يوجد عجز' : 'التوزيع متوازن ✓'}</span>
              </div>
              <div className="grid grid-cols-3 gap-4">
                {[
                  { label: 'المطلوب/حصة', value: balance.required, color: 'text-blue-600', bg: 'bg-white border border-blue-300' },
                  { label: 'المتاح/حصة', value: balance.available, color: 'text-emerald-600', bg: 'bg-white border border-emerald-300' },
                  { label: 'العجز', value: balance.deficit, color: balance.deficit > 0 ? 'text-red-600' : 'text-slate-400', bg: balance.deficit > 0 ? 'bg-white border border-red-300' : 'bg-slate-50' },
                ].map(item => (
                  <div key={item.label} className={`${item.bg} rounded-xl p-4 text-center border border-white/60`}>
                    <div className={`text-2xl font-black ${item.color}`}>{item.value}</div>
                    <div className="text-[10px] text-slate-500 font-bold mt-1">{item.label}</div>
                  </div>
                ))}
              </div>
              {balance.deficit > 0 && (
                <p className="text-sm text-white mt-4 font-bold bg-red-500 rounded-xl p-3">
                  💡 الرقم الأقرب المتاح: <span className="font-black text-lg">{balance.suggestedMax}</span> منتظرين/حصة
                </p>
              )}
            </div>
          )}
          </div>
        </div>
      )}

      {config.method === 'manual' && (
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-4">
            <div /><div />
            <div className="flex justify-center">
              <div className="w-0 h-0 border-l-[8px] border-r-[8px] border-t-[8px] border-l-transparent border-r-transparent border-t-[#8779fb]" />
            </div>
          </div>
        <div className="px-2 space-y-2">
          {[
            'التحكم الكامل في عدد ومواقع حصص الانتظار لكل معلم',
            'ستكون حصص الانتظار جاهزة أمام اسم كل معلم وبإمكانك سحبها وإفلاتها في الحصص الفارغة',
          ].map((text, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="text-[#8779fb] font-black text-lg leading-none">•</span>
              <span className="text-sm text-slate-500 font-medium">{text}</span>
            </div>
          ))}
        </div>
        </div>
      )}

      {/* Substitution Warnings */}
      {warnings.filter(w => w.id.startsWith('sub-')).map(w => (
        <div key={w.id} className="bg-amber-50/80 border-2 border-amber-200/60 rounded-2xl p-4 flex items-start gap-3">
          <AlertTriangle className="text-amber-500 shrink-0 mt-0.5" size={18} />
          <div>
            <p className="text-sm font-bold text-amber-700">{w.message}</p>
            {w.suggestion && <p className="text-xs text-amber-600 mt-1">{w.suggestion}</p>}
          </div>
        </div>
      ))}
    </div>
  );
}
