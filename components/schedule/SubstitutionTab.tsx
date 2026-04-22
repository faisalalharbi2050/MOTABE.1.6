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
  onChange: (config: SubstitutionConfig) => void;
}

export default function SubstitutionTab({ teachers, config, weekDays, periodsPerDay, warnings: _warnings, onChange }: Props) {
  const totalWeeklyPeriods = weekDays * periodsPerDay;

  const balance = useMemo(
    () => calculateSubstitutionBalance(teachers, config.maxTotalQuota, totalWeeklyPeriods, config.fixedPerPeriod || 0),
    [teachers, config.maxTotalQuota, totalWeeklyPeriods, config.fixedPerPeriod]
  );

  const methods = [
    { id: 'auto' as const, label: 'التوزيع التلقائي', icon: Zap },
    { id: 'fixed' as const, label: 'التوزيع المحدد', icon: ArrowLeftRight },
    { id: 'manual' as const, label: 'التوزيع اليدوي', icon: GripHorizontal },
  ];

  const bulletClass = 'text-sm text-slate-800 font-medium';

  return (
    <div className="space-y-6">
      <div className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-slate-300 bg-white">
            <Info size={18} className="text-[#655ac1]" />
          </div>
          <div className="flex-1">
            <p className="text-base font-black text-slate-800">ما قبل إنشاء حصص الانتظار</p>
            <ul className="mt-4 space-y-3 list-none text-sm">
              <li className="flex items-start gap-2.5">
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-slate-300 bg-white text-[11px] font-black text-[#655ac1]">
                  1
                </span>
                <span className={bulletClass}>راجع الحد الأقصى للنصاب والحد الأقصى اليومي</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-slate-300 bg-white text-[11px] font-black text-[#655ac1]">
                  2
                </span>
                <span className={bulletClass}>اختر طريقة التوزيع واتبع التوضيحات ثم انقر على زر إنشاء حصص الانتظار</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-slate-300 bg-white text-[11px] font-black text-[#655ac1]">
                  3
                </span>
                <span className={bulletClass}>يرمز لحصص الانتظار بـ (م انتظار).</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      <div className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-white border border-slate-300 flex items-center justify-center">
            <Clock size={18} className="text-[#655ac1]" />
          </div>
          <h3 className="font-black text-slate-800">الإعدادات العامة</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="space-y-2">
            <label className="text-xs font-black text-slate-500 uppercase tracking-wide">
              الحد الأقصى للنصاب (أساسي + انتظار)
            </label>
            <div className="relative">
              <input
                type="number"
                min={1}
                max={40}
                value={config.maxTotalQuota}
                onChange={e => onChange({ ...config, maxTotalQuota: Number(e.target.value) })}
                className="w-full bg-white border-2 border-slate-200 rounded-xl pr-4 pl-20 py-3 text-sm font-bold focus:ring-2 focus:ring-[#8779fb]/30 focus:border-[#655ac1] outline-none transition-all"
              />
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[11px] font-bold text-slate-400 pointer-events-none border-r border-slate-200 pl-2">
                حصة/أسبوع
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-black text-slate-500 uppercase tracking-wide">
              الحد الأقصى اليومي (أساسي + انتظار)
            </label>
            <div className="relative">
              <input
                type="number"
                min={1}
                max={10}
                value={config.maxDailyTotal}
                onChange={e => onChange({ ...config, maxDailyTotal: Number(e.target.value) })}
                className="w-full bg-white border-2 border-slate-200 rounded-xl pr-4 pl-20 py-3 text-sm font-bold focus:ring-2 focus:ring-[#8779fb]/30 focus:border-[#655ac1] outline-none transition-all"
              />
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[11px] font-bold text-slate-400 pointer-events-none border-r border-slate-200 pl-2">
                حصة/يوم
              </span>
            </div>
          </div>
        </div>

        <p className="mt-3 text-[11px] text-[#655ac1] font-medium flex items-center gap-1.5">
          <Info size={12} className="text-[#655ac1] shrink-0" />
          يمكنك تعديل هذه الإعدادات حسب احتياج المدرسة وآلية توزيع الانتظار المناسبة.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {methods.map(method => {
          const isSelected = config.method === method.id;

          return (
            <button
              key={method.id}
              onClick={() => onChange({ ...config, method: method.id })}
              className={`relative p-3.5 rounded-2xl border-2 text-right transition-all duration-200 bg-white ${
                isSelected
                  ? 'border-[#655ac1] shadow-lg shadow-[#655ac1]/10'
                  : 'border-slate-300 hover:border-slate-400 hover:shadow-md'
              }`}
            >
              <div
                className={`absolute top-4 left-4 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all duration-200 ${
                  isSelected ? 'border-[#655ac1] bg-white' : 'border-slate-300 bg-white'
                }`}
              >
                {isSelected && <div className="w-2.5 h-2.5 rounded-full bg-[#655ac1]" />}
              </div>

              <div className="flex flex-col items-center gap-1.5 py-1.5">
                <method.icon size={20} className={isSelected ? 'text-[#655ac1]' : 'text-slate-400'} />
                <h4 className={`font-black text-sm transition-colors duration-200 ${isSelected ? 'text-[#655ac1]' : 'text-slate-600'}`}>
                  {method.label}
                </h4>
              </div>
            </button>
          );
        })}
      </div>

      {config.method === 'auto' && (
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-4">
            <div className="flex justify-center">
              <div className="w-0 h-0 border-l-[8px] border-r-[8px] border-t-[8px] border-l-transparent border-r-transparent border-t-[#8779fb]" />
            </div>
            <div />
            <div />
          </div>

          <div className="px-2 space-y-2">
            {[
              'ملء فراغات المعلمين في جداولهم تلقائيًا بنصاب الانتظار المحدد لهم مسبقًا',
              `الحد الأقصى اليومي في التوزيع ${config.maxDailyTotal} حصص تشمل (مواد + انتظار)`,
              'توزيع الانتظار للمعلم على أيام الأسبوع في الحصص الأولى والوسطى والأخيرة',
            ].map((text, index) => (
              <div key={index} className="flex items-center gap-2">
                <span className="text-[#8779fb] font-black text-lg leading-none">•</span>
                <span className={bulletClass}>{text}</span>
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
                `تغطية كل حصة بعدد ${config.fixedPerPeriod || 'X'} من المنتظرين بشكل ثابت`,
                'توزيع حصص الانتظار للمعلم بناءً على الفراغات المتاحة',
                'تنبيه فوري في حال وجود عجز في عدد المعلمين لتغطية العدد المحدد',
              ].map((text, index) => (
                <div key={index} className="flex items-center gap-2">
                  <span className="text-[#8779fb] font-black text-lg leading-none">•</span>
                  <span className={bulletClass}>{text}</span>
                </div>
              ))}
            </div>

            <div className="space-y-2 px-2">
              <label className="text-sm font-black text-slate-700">عدد المنتظرين لكل حصة</label>
              <input
                type="number"
                min={1}
                max={20}
                value={config.fixedPerPeriod || ''}
                onChange={e => onChange({ ...config, fixedPerPeriod: Number(e.target.value) })}
                placeholder="مثال: 5"
                className="w-64 bg-white border-2 border-slate-200 rounded-xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-blue-200 focus:border-blue-400 outline-none transition-all"
              />
            </div>

            {config.fixedPerPeriod && config.fixedPerPeriod > 0 && (
              <div
                className={`rounded-[1.75rem] p-5 border-2 ${
                  balance.deficit > 0
                    ? 'bg-gradient-to-br from-white via-red-50/40 to-white border-red-400 shadow-[0_12px_30px_rgba(239,68,68,0.12)]'
                    : 'bg-gradient-to-br from-white via-emerald-50/70 to-white border-emerald-300 shadow-[0_12px_28px_rgba(16,185,129,0.10)]'
                }`}
              >
                <div className="flex items-center gap-2 mb-4">
                  {balance.deficit > 0 ? (
                    <AlertTriangle className="text-red-500" size={20} />
                  ) : (
                    <Check className="text-emerald-500" size={20} />
                  )}
                  <span className="font-black text-base">{balance.deficit > 0 ? 'يوجد عجز' : 'التوزيع متوازن'}</span>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  {[
                    { label: 'المطلوب', value: balance.required, color: 'text-slate-700', bg: 'bg-white border border-slate-300' },
                    {
                      label: 'المتاح',
                      value: balance.available,
                      color: balance.deficit > 0 ? 'text-amber-600' : 'text-slate-700',
                      bg: 'bg-white border border-slate-300',
                    },
                    {
                      label: 'العجز',
                      value: balance.deficit,
                      color: balance.deficit > 0 ? 'text-red-600' : 'text-slate-400',
                      bg: balance.deficit > 0 ? 'bg-white border border-red-200' : 'bg-slate-50',
                    },
                  ].map(item => (
                    <div key={item.label} className={`${item.bg} rounded-2xl p-4 text-center border border-white/60`}>
                      <div className={`text-2xl font-black ${item.color}`}>{item.value}</div>
                      <div className="text-[10px] font-bold mt-1 text-slate-500">{item.label}</div>
                    </div>
                  ))}
                </div>

                {balance.deficit > 0 && (
                  <div className="mt-4 rounded-2xl border border-red-200 bg-white p-4">
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border border-red-200 bg-red-50">
                        <AlertTriangle size={18} className="text-red-500" />
                      </div>
                      <div className="space-y-2">
                        <p className="text-sm font-black text-red-700">
                          عدد المنتظرين المتاح أقل من العدد المطلوب للتغطية المحددة.
                        </p>
                        <p className="text-sm font-medium text-red-600">
                          الرقم الأقرب المتاح: <span className="font-black text-lg">{balance.suggestedMax}</span> منتظرين/حصة
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {balance.deficit <= 0 && (
                  <div className="mt-4 rounded-2xl border border-emerald-200 bg-white p-4">
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border border-emerald-200 bg-emerald-50">
                        <Check size={18} className="text-emerald-500" />
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm font-black text-emerald-700">التوزيع المحدد متوازن وجاهز للتنفيذ.</p>
                        <p className="text-sm font-medium text-emerald-600">
                          العدد المتاح يغطي العدد المطلوب لكل حصة دون وجود عجز.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {config.method === 'manual' && (
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-4">
            <div />
            <div />
            <div className="flex justify-center">
              <div className="w-0 h-0 border-l-[8px] border-r-[8px] border-t-[8px] border-l-transparent border-r-transparent border-t-[#8779fb]" />
            </div>
          </div>

          <div className="px-2 space-y-2">
            {[
              'التحكم الكامل في عدد ومواقع حصص الانتظار لكل معلم.',
              'انقر على زر إنشاء بطاقات الانتظار ثم انتقل إلى صفحة المعاينة والتعديل للسحب والإفلات.',
            ].map((text, index) => (
              <div key={index} className="flex items-center gap-2">
                <span className="text-[#8779fb] font-black text-lg leading-none">•</span>
                <span className={bulletClass}>{text}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
