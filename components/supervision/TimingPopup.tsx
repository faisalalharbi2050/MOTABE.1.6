import React, { useState } from 'react';
import { Clock, Plus, Trash2, Check, Utensils, Sunset } from 'lucide-react';
import { SchoolInfo, BreakInfo, PrayerInfo, TimingConfig } from '../../types';
import { Button } from '../ui/Button';

interface Props {
  schoolInfo: SchoolInfo;
  setSchoolInfo: React.Dispatch<React.SetStateAction<SchoolInfo>>;
  onClose: () => void;
  showToast: (msg: string, type: 'success' | 'warning' | 'error') => void;
  onNavigateToTiming?: () => void;
}

const TimingPopup: React.FC<Props> = ({ schoolInfo, setSchoolInfo, onClose, showToast, onNavigateToTiming }) => {
  const existingTiming = schoolInfo.timing;

  const maxPeriods = existingTiming?.periodCounts
    ? Math.max(...Object.values(existingTiming.periodCounts))
    : 8;
  const periodOptions = Array.from({ length: maxPeriods }, (_, i) => i + 1);

  const [breaks, setBreaks] = useState<BreakInfo[]>(existingTiming?.breaks || [
    { id: 'brk-1', name: 'الفسحة الأولى', duration: 25, afterPeriod: 2 },
  ]);

  const [prayers, setPrayers] = useState<PrayerInfo[]>(existingTiming?.prayers || [
    { id: 'prayer-1', name: 'صلاة الظهر', duration: 20, afterPeriod: 6, isEnabled: true },
  ]);

  const addBreak = () => {
    setBreaks(prev => [...prev, {
      id: `brk-${Date.now()}`,
      name: `فسحة ${prev.length + 1}`,
      duration: 20,
      afterPeriod: 4,
    }]);
  };

  const addPrayer = () => {
    setPrayers(prev => [...prev, {
      id: `prayer-${Date.now()}`,
      name: 'صلاة',
      duration: 15,
      afterPeriod: 6,
      isEnabled: true,
    }]);
  };

  const handleSave = () => {
    const updates: Partial<TimingConfig> = {
      breaks,
      prayers,
    };

    setSchoolInfo(prev => ({
      ...prev,
      timing: {
        ...(prev.timing || {
          activeDays: ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday'],
          periodDuration: 45,
          assemblyTime: '06:45',
          periodCounts: { sunday: 7, monday: 7, tuesday: 7, wednesday: 7, thursday: 7 },
        }),
        breaks: updates.breaks || [],
        prayers: updates.prayers || [],
      } as TimingConfig,
    }));

    showToast('تم حفظ بيانات التوقيت', 'success');
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[85vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-slate-200 p-5 rounded-t-2xl flex items-center gap-3 z-10">
          <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center shrink-0">
            <Clock size={20} className="text-[#655ac1]" />
          </div>
          <div>
            <h3 className="text-lg font-black text-slate-800">إعداد الفسح والصلاة</h3>
            <p className="text-xs text-slate-400">أضف أوقاتها لاكتمال جدول الإشراف</p>
          </div>
        </div>

        <div className="p-5 space-y-6">
          {/* Info */}
          <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-3 text-sm text-indigo-700">
            لإنشاء جدول الإشراف بشكل صحيح يجب إضافة أوقات الفسح والصلاة
          </div>

          {/* Breaks */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-bold text-slate-700 flex items-center gap-2">
                <Utensils size={16} className="text-[#655ac1]" /> الفسح
              </h4>
              <button onClick={addBreak} className="p-1.5 rounded-lg hover:bg-slate-100 text-[#655ac1]">
                <Plus size={16} />
              </button>
            </div>
            <div className="space-y-2">
              {breaks.map((brk) => (
                <div key={brk.id} className="bg-slate-50 rounded-xl p-3 border border-slate-100 space-y-2">
                  <input
                    type="text"
                    value={brk.name}
                    onChange={e => setBreaks(prev => prev.map(b => b.id === brk.id ? { ...b, name: e.target.value } : b))}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-sm outline-none focus:border-indigo-400"
                    placeholder="اسم الفسحة"
                  />
                  <div className="flex items-center gap-3">
                    <div className="flex flex-col gap-0.5 flex-1">
                      <label className="text-xs text-slate-400">بعد الحصة رقم</label>
                      <select
                        value={brk.afterPeriod}
                        onChange={e => setBreaks(prev => prev.map(b => b.id === brk.id ? { ...b, afterPeriod: Number(e.target.value) } : b))}
                        className="w-full px-2 py-1 rounded-lg border border-slate-200 text-sm text-center outline-none focus:border-indigo-400 bg-white"
                      >
                        {periodOptions.map(n => (
                          <option key={n} value={n}>الحصة {n}</option>
                        ))}
                      </select>
                    </div>
                    <div className="flex flex-col gap-0.5 flex-1">
                      <label className="text-xs text-slate-400">المدة (دقيقة)</label>
                      <input
                        type="number"
                        value={brk.duration}
                        onChange={e => setBreaks(prev => prev.map(b => b.id === brk.id ? { ...b, duration: Number(e.target.value) } : b))}
                        className="w-full px-2 py-1 rounded-lg border border-slate-200 text-sm text-center outline-none focus:border-indigo-400"
                        min={5}
                        max={60}
                      />
                    </div>
                    <button
                      onClick={() => setBreaks(prev => prev.filter(b => b.id !== brk.id))}
                      className="p-1.5 rounded-lg hover:bg-red-50 text-red-400 mt-4"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Prayers */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-bold text-slate-700 flex items-center gap-2">
                <Sunset size={16} className="text-[#655ac1]" /> الصلاة
              </h4>
              <button onClick={addPrayer} className="p-1.5 rounded-lg hover:bg-slate-100 text-[#655ac1]">
                <Plus size={16} />
              </button>
            </div>
            <div className="space-y-2">
              {prayers.map((prayer) => (
                <div key={prayer.id} className="bg-slate-50 rounded-xl p-3 border border-slate-100 space-y-2">
                  <input
                    type="text"
                    value={prayer.name}
                    onChange={e => setPrayers(prev => prev.map(p => p.id === prayer.id ? { ...p, name: e.target.value } : p))}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-sm outline-none focus:border-indigo-400"
                    placeholder="اسم الصلاة"
                  />
                  <div className="flex items-center gap-3">
                    <div className="flex flex-col gap-0.5 flex-1">
                      <label className="text-xs text-slate-400">بعد الحصة رقم</label>
                      <select
                        value={prayer.afterPeriod}
                        onChange={e => setPrayers(prev => prev.map(p => p.id === prayer.id ? { ...p, afterPeriod: Number(e.target.value) } : p))}
                        className="w-full px-2 py-1 rounded-lg border border-slate-200 text-sm text-center outline-none focus:border-indigo-400 bg-white"
                      >
                        {periodOptions.map(n => (
                          <option key={n} value={n}>الحصة {n}</option>
                        ))}
                      </select>
                    </div>
                    <div className="flex flex-col gap-0.5 flex-1">
                      <label className="text-xs text-slate-400">المدة (دقيقة)</label>
                      <input
                        type="number"
                        value={prayer.duration}
                        onChange={e => setPrayers(prev => prev.map(p => p.id === prayer.id ? { ...p, duration: Number(e.target.value) } : p))}
                        className="w-full px-2 py-1 rounded-lg border border-slate-200 text-sm text-center outline-none focus:border-indigo-400"
                        min={5}
                        max={60}
                      />
                    </div>
                    <button
                      onClick={() => setPrayers(prev => prev.filter(p => p.id !== prayer.id))}
                      className="p-1.5 rounded-lg hover:bg-red-50 text-red-400 mt-4"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white border-t border-slate-200 p-5 rounded-b-2xl flex flex-wrap justify-between items-center gap-3">
          {onNavigateToTiming ? (
            <button
              onClick={() => { onClose(); onNavigateToTiming(); }}
              className="text-sm text-[#655ac1] hover:underline underline-offset-2"
            >
              الانتقال لصفحة التوقيت ←
            </button>
          ) : <span />}
          <div className="flex gap-3">
            <Button variant="outline" onClick={onClose} className="border">تخطي الآن</Button>
            <Button variant="primary" icon={Check} onClick={handleSave}>حفظ التوقيت</Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TimingPopup;
