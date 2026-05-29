import React, { useMemo, useState } from 'react';
import { Teacher, SubstitutionConfig } from '../../types';
import { Settings2, Zap, ArrowLeftRight, Check, CheckCircle2, AlertTriangle, Info, GripHorizontal, Users, X } from 'lucide-react';
import { ValidationWarning } from '../../utils/scheduleConstraints';
import { getEffectiveWaitingQuota } from '../../utils/scheduleInteractive';

interface Props {
  teachers: Teacher[];
  config: SubstitutionConfig;
  weekDays: number;
  periodsPerDay: number;
  warnings: ValidationWarning[];
  onChange: (config: SubstitutionConfig) => void;
}

const ACCENT = '#655ac1';

export default function SubstitutionTabV3({ teachers, config, weekDays, periodsPerDay, warnings: _warnings, onChange }: Props) {
  const totalSlots = weekDays * periodsPerDay;
  const [showMissingModal, setShowMissingModal] = useState(false);

  // مجموع أنصبة الانتظار الفعلية (تشمل أنصبة المدارس المشتركة)
  const totalWaitingQuota = useMemo(
    () => teachers.reduce((sum, t) => sum + getEffectiveWaitingQuota(t), 0),
    [teachers]
  );

  const missingQuotaTeachers = useMemo(
    () => teachers.filter(t => getEffectiveWaitingQuota(t) <= 0),
    [teachers]
  );

  // توازن "التوزيع المحدّد": المطلوب = عدد المنتظرين لكل حصة × عدد الحصص الأسبوعية
  const balance = useMemo(() => {
    const required = (config.fixedPerPeriod || 0) * totalSlots;
    const available = totalWaitingQuota;
    const enough = available >= required;
    const suggestedMax = totalSlots > 0 ? Math.floor(available / totalSlots) : 0;
    return { required, available, enough, suggestedMax };
  }, [config.fixedPerPeriod, totalSlots, totalWaitingQuota]);

  const methods = [
    { id: 'auto' as const, label: 'التوزيع الآلي', icon: Zap, desc: 'ملأ فراغات كل معلم بكامل نصاب انتظاره المحدّد' },
    { id: 'fixed' as const, label: 'التوزيع المحدّد', icon: ArrowLeftRight, desc: 'تغطية كل حصة بعدد ثابت من المنتظرين.' },
    { id: 'manual' as const, label: 'التوزيع اليدوي', icon: GripHorizontal, desc: 'تحكّم كامل في عدد ومواقع حصص الانتظار لكل معلم.' },
  ];

  const bulletClass = 'text-sm text-slate-700 font-medium leading-relaxed';
  const Bullet = ({ children }: { children: React.ReactNode }) => (
    <div className="flex items-start gap-2.5">
      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: ACCENT }} />
      <span className={bulletClass}>{children}</span>
    </div>
  );

  return (
    <div className="space-y-5">
      {/* تنبيه إرشادي — صفّ مسطّح بلا إطار داخلي (الإطار الرئيسي يحيط القسم بالكامل) */}
      <div className="flex items-start gap-3">
        <Info size={20} className="mt-0.5 shrink-0" style={{ color: ACCENT }} />
        <p className="text-sm font-bold text-slate-800 leading-relaxed">
          يملأ النظام الحصص الفارغة لكل معلم بحصص انتظار وفق نصاب الانتظار المحدّد له في صفحة المعلمين. اضبط الحد اليومي واختر طريقة التوزيع ثم نفّذ.
        </p>
      </div>

      {/* الإعدادات العامة — قسم مسطّح مفصول بخط رفيع */}
      <div className="border-t border-slate-100 pt-5">
        <div className="flex items-center gap-3 mb-5">
          <Settings2 size={20} style={{ color: ACCENT }} />
          <h3 className="font-black text-slate-800">إعداد وتوزيع الانتظار</h3>
        </div>

        <div className="max-w-xs space-y-2">
          <label className="text-xs font-black text-slate-500">الحد الأقصى اليومي (أساسي + انتظار)</label>
          <div className="relative">
            <input
              type="number"
              min={1}
              max={10}
              value={config.maxDailyTotal}
              onChange={e => onChange({ ...config, maxDailyTotal: Number(e.target.value) })}
              className="w-full bg-white border-2 border-slate-200 rounded-xl pr-4 pl-20 py-3 text-sm font-bold outline-none transition-all focus:border-[#655ac1] focus:ring-2 focus:ring-[#655ac1]/20"
            />
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[11px] font-bold text-slate-400 pointer-events-none border-r border-slate-200 pl-2">
              حصة/يوم
            </span>
          </div>
        </div>

        {missingQuotaTeachers.length > 0 && (
          <div className="mt-4 flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 flex-wrap">
            <div className="flex items-start gap-2.5">
              <AlertTriangle size={16} className="mt-0.5 shrink-0 text-amber-600" />
              <p className="text-xs font-bold text-amber-800 leading-relaxed">
                {missingQuotaTeachers.length} معلمًا بدون نصاب انتظار — لن يُسند لهم انتظار في التوزيع الآلي.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowMissingModal(true)}
              className="shrink-0 inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-xs font-black text-slate-800 hover:bg-slate-50 transition-all"
            >
              <Users size={14} className="text-slate-800" /> عرض
            </button>
          </div>
        )}
      </div>

      {/* اختيار الطريقة */}
      <div className="space-y-3 border-t border-slate-100 pt-5">
        <h3 className="font-black text-slate-800 px-1">طريقة التوزيع</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {methods.map(method => {
          const active = config.method === method.id;
          return (
            <button
              key={method.id}
              onClick={() => onChange({ ...config, method: method.id })}
              className={`relative text-right px-5 py-4 rounded-2xl border-2 bg-white transition-all flex items-start gap-3 ${
                active
                  ? 'border-slate-300 shadow-lg shadow-slate-200/70'
                  : 'border-slate-200 hover:border-slate-300 hover:shadow-md'
              }`}
            >
              <span className="w-10 h-10 shrink-0 rounded-xl flex items-center justify-center">
                <method.icon size={20} className={active ? 'text-[#655ac1]' : 'text-slate-400'} />
              </span>
              <span className="flex-1 min-w-0">
                <span className={`block font-black text-sm mb-0.5 ${active ? 'text-[#655ac1]' : 'text-slate-800'}`}>{method.label}</span>
                <span className="block text-[11px] font-medium text-slate-500 leading-5">{method.desc}</span>
              </span>
              <span className={`shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center mt-0.5 ${active ? 'border-[#655ac1] bg-[#655ac1] text-white' : 'border-slate-300 bg-white text-transparent'}`}>
                <Check size={12} strokeWidth={3} />
              </span>
            </button>
          );
        })}
        </div>
      </div>

      {/* تفاصيل الطريقة المختارة — قسم مسطّح مفصول بخط رفيع */}
      <div className="border-t border-slate-100 pt-5 space-y-4">
        {config.method === 'auto' && (
          <div className="space-y-2.5">
            <Bullet>يملأ فراغات كل معلم حتى يبلغ <span style={{ color: ACCENT }} className="font-black">نصاب انتظاره</span> المحدّد في صفحة المعلمين.</Bullet>
            <Bullet>لا يتجاوز <span className="font-black">{config.maxDailyTotal}</span> حصص في اليوم الواحد (مواد + انتظار).</Bullet>
            <Bullet>يوزّع الانتظار على أيام الأسبوع وفي حصص مختلفة قدر الإمكان.</Bullet>
          </div>
        )}

        {config.method === 'fixed' && (
          <div className="space-y-4">
            <div className="space-y-2.5">
              <Bullet>تغطية كل حصة بعدد ثابت من المنتظرين تحدّده بالأسفل.</Bullet>
              <Bullet>يوزّع مع احترام نصاب انتظار كل معلم والحد اليومي.</Bullet>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-black text-slate-700">عدد المنتظرين لكل حصة</label>
              <input
                type="number"
                min={1}
                max={20}
                value={config.fixedPerPeriod || ''}
                onChange={e => onChange({ ...config, fixedPerPeriod: Number(e.target.value) })}
                placeholder="مثال: 3"
                className="w-64 bg-white border-2 border-slate-200 rounded-xl px-4 py-3 text-sm font-bold outline-none transition-all focus:border-[#655ac1] focus:ring-2 focus:ring-[#655ac1]/20"
              />
            </div>

            {!!config.fixedPerPeriod && config.fixedPerPeriod > 0 && (
              balance.enough ? (
                <div className="rounded-2xl p-5 border-2 border-emerald-300 bg-white flex items-start gap-3">
                  <span className="mt-0.5 inline-flex items-center justify-center w-6 h-6 rounded-full bg-emerald-500 text-white shrink-0">
                    <Check size={14} strokeWidth={3.5} />
                  </span>
                  <div className="space-y-1">
                    <p className="text-sm font-black text-emerald-700">العدد مناسب لكل حصة</p>
                    <p className="text-sm font-medium text-emerald-700/90">
                      يمكن تغطية كل حصة بـ <span className="font-black">{config.fixedPerPeriod}</span> منتظرين دون مشكلة.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl p-5 border-2 border-rose-300 bg-white flex items-start gap-3">
                  <AlertTriangle size={24} className="mt-0.5 shrink-0 text-rose-500" />
                  <div className="space-y-1">
                    <p className="text-sm font-black text-rose-700">عدد المنتظرين لكل حصة أكبر من المتاح</p>
                    <p className="text-sm font-medium text-rose-600">
                      أقصى عدد مناسب حاليًا: <span className="font-black text-base">{balance.suggestedMax}</span> منتظرين لكل حصة. قلّل الرقم، أو ارفع نصاب الانتظار للمعلمين.
                    </p>
                  </div>
                </div>
              )
            )}
          </div>
        )}

        {config.method === 'manual' && (
          <div className="space-y-2.5">
            <Bullet>تحكّم كامل في عدد ومواقع حصص الانتظار لكل معلم.</Bullet>
            <Bullet>اضغط «إنشاء بطاقات الانتظار» ثم يمكنك توزيع البطاقات بالسحب والإفلات.</Bullet>
            <Bullet>عدد البطاقات لكل معلم = نصاب انتظاره المحدّد له.</Bullet>
          </div>
        )}
      </div>

      {/* نافذة أسماء المعلمين بدون نصاب انتظار */}
      {showMissingModal && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in"
          onClick={() => setShowMissingModal(false)}
        >
          <div
            className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95"
            dir="rtl"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <Users size={22} style={{ color: ACCENT }} />
                <div>
                  <h3 className="font-black text-slate-800">معلمون بدون نصاب انتظار</h3>
                  <p className="text-xs text-slate-500 mt-0.5">{missingQuotaTeachers.length} معلمًا لن يُسند لهم انتظار آليًا</p>
                </div>
              </div>
              <button onClick={() => setShowMissingModal(false)} className="w-9 h-9 flex items-center justify-center rounded-full border border-slate-200 text-slate-400 hover:text-slate-600 hover:border-slate-300 transition-colors">
                <X size={18} />
              </button>
            </div>
            <div className="max-h-[55vh] overflow-auto">
              <table className="w-full text-right text-sm" dir="rtl">
                <thead className="sticky top-0 bg-slate-50 border-b border-slate-100">
                  <tr>
                    <th className="px-5 py-3 text-xs font-black text-[#655ac1] w-14 text-center">م</th>
                    <th className="px-5 py-3 text-xs font-black text-[#655ac1]">اسم المعلم</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {missingQuotaTeachers.map((t, i) => (
                    <tr key={t.id} className="hover:bg-slate-50/60 transition-all">
                      <td className="px-5 py-3 text-center">
                        <span className="text-xs font-bold text-slate-400 bg-slate-50 w-6 h-6 flex items-center justify-center rounded-full mx-auto">
                          {i + 1}
                        </span>
                      </td>
                      <td className="px-5 py-3 font-bold text-slate-800">{t.name}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-5 py-3 border-t border-slate-100 bg-slate-50 flex justify-end">
              <button onClick={() => setShowMissingModal(false)} className="px-5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-600 font-bold text-sm hover:bg-slate-50 transition-all">
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
