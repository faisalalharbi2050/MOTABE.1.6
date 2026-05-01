import React, { useMemo, useState } from 'react';
import {
  AlertTriangle, Check, Clock, Edit3, MapPin, Plus, Power, Trash2, X
} from 'lucide-react';
import {
  SchoolInfo, SupervisionLocation, SupervisionPeriodConfig
} from '../../types';
import { getTimingConfig, hasTimingData } from '../../utils/supervisionUtils';

const PERIOD_OPTIONS = [
  { value: 1, label: 'بعد الحصة الأولى' },
  { value: 2, label: 'بعد الحصة الثانية' },
  { value: 3, label: 'بعد الحصة الثالثة' },
  { value: 4, label: 'بعد الحصة الرابعة' },
  { value: 5, label: 'بعد الحصة الخامسة' },
  { value: 6, label: 'بعد الحصة السادسة' },
  { value: 7, label: 'بعد الحصة السابعة' },
  { value: 8, label: 'بعد الحصة الثامنة' },
];

const ToggleButton: React.FC<{ active: boolean; onClick: () => void }> = ({ active, onClick }) => (
  <button
    onClick={onClick}
    className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-black transition-all active:scale-95 ${
      active
        ? 'bg-green-50 text-green-700 border-green-200 shadow-sm shadow-green-100 hover:bg-green-100'
        : 'bg-slate-50 text-slate-400 border-slate-200 hover:bg-slate-100 hover:text-slate-600'
    }`}
    title={active ? 'تعطيل' : 'تفعيل'}
  >
    <Power size={16} />
    <span>{active ? 'مفعّل' : 'معطّل'}</span>
  </button>
);

const EditButton: React.FC<{ onClick: () => void; title?: string }> = ({ onClick, title = 'تعديل' }) => (
  <button
    onClick={onClick}
    className="p-2 rounded-xl border border-slate-200 text-slate-500 hover:text-slate-700 hover:bg-slate-50 transition-colors"
    title={title}
  >
    <Edit3 size={18} />
  </button>
);

const CardHeader: React.FC<{ icon: React.ElementType; title: string; description: string; action?: React.ReactNode }> = ({
  icon: Icon, title, description, action
}) => (
  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
    <div className="flex items-center gap-4">
      <Icon size={28} strokeWidth={1.8} className="text-[#655ac1] shrink-0" />
      <div>
        <h3 className="text-lg font-black text-slate-800">{title}</h3>
        <p className="text-xs font-medium text-slate-500 mt-1">{description}</p>
      </div>
    </div>
    {action}
  </div>
);

const CARD_CLASS = "bg-white rounded-[2rem] p-5 sm:p-6 shadow-sm border-2 border-slate-200";

interface Props {
  activeView?: 'locations' | 'periods';
  locations: SupervisionLocation[];
  setLocations: (locs: SupervisionLocation[] | ((prev: SupervisionLocation[]) => SupervisionLocation[])) => void;
  periods: SupervisionPeriodConfig[];
  setPeriods: (p: SupervisionPeriodConfig[] | ((prev: SupervisionPeriodConfig[]) => SupervisionPeriodConfig[])) => void;
  schoolInfo: SchoolInfo;
  showToast: (msg: string, type: 'success' | 'warning' | 'error') => void;
  onNavigateToTiming?: () => void;
}

const SupervisionLocationsPanel: React.FC<Props> = ({
  locations, setLocations, periods, setPeriods, schoolInfo, showToast, activeView, onNavigateToTiming
}) => {
  const [editingLocationId, setEditingLocationId] = useState<string | null>(null);
  const [editingPeriodId, setEditingPeriodId] = useState<string | null>(null);
  const [deleteLocationId, setDeleteLocationId] = useState<string | null>(null);
  const [deletePeriodId, setDeletePeriodId] = useState<string | null>(null);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [showPeriodModal, setShowPeriodModal] = useState(false);
  const [locationName, setLocationName] = useState('');
  const [periodForm, setPeriodForm] = useState({ name: '', afterPeriod: 1, duration: 20 });

  const timing = getTimingConfig(schoolInfo);

  const periodMeta = useMemo(() => {
    const map = new Map<string, { afterPeriod?: number; duration?: number }>();
    timing.breaks?.forEach(b => map.set(`break-${b.id}`, { afterPeriod: b.afterPeriod, duration: b.duration }));
    timing.prayers?.forEach(p => map.set(`prayer-${p.id}`, { afterPeriod: p.afterPeriod, duration: p.duration }));
    return map;
  }, [timing.breaks, timing.prayers]);

  const getAfterPeriod = (period: SupervisionPeriodConfig) => (
    period.afterPeriod || periodMeta.get(period.id)?.afterPeriod
  );

  const getPeriodLabel = (period: SupervisionPeriodConfig) => {
    const afterPeriod = getAfterPeriod(period);
    return PERIOD_OPTIONS.find(p => p.value === afterPeriod)?.label || 'غير محدد';
  };

  const saveLocation = () => {
    if (!locationName.trim()) {
      showToast('يرجى إدخال اسم الموقع', 'warning');
      return;
    }

    if (editingLocationId) {
      setLocations(prev => prev.map(l => l.id === editingLocationId ? { ...l, name: locationName.trim() } : l));
      showToast('تم تحديث الموقع', 'success');
    } else {
      setLocations(prev => [...prev, {
        id: `loc-${Date.now()}`,
        name: locationName.trim(),
        category: 'custom',
        isActive: true,
        sortOrder: prev.length + 1,
      }]);
      showToast('تم إضافة الموقع', 'success');
    }

    setLocationName('');
    setEditingLocationId(null);
    setShowLocationModal(false);
  };

  const openEditLocation = (loc: SupervisionLocation) => {
    setEditingLocationId(loc.id);
    setLocationName(loc.name);
    setShowLocationModal(true);
  };

  const deleteLocation = (id: string) => {
    setLocations(prev => prev.filter(l => l.id !== id));
    setDeleteLocationId(null);
    showToast('تم حذف الموقع', 'success');
  };

  const toggleLocation = (id: string) => {
    setLocations(prev => prev.map(l => l.id === id ? { ...l, isActive: !l.isActive } : l));
  };

  const openPeriodModal = (period?: SupervisionPeriodConfig) => {
    if (period) {
      setEditingPeriodId(period.id);
      setPeriodForm({
        name: period.name,
        afterPeriod: getAfterPeriod(period) || 1,
        duration: period.duration || periodMeta.get(period.id)?.duration || 20,
      });
    } else {
      setEditingPeriodId(null);
      setPeriodForm({ name: '', afterPeriod: 1, duration: 20 });
    }
    setShowPeriodModal(true);
  };

  const savePeriod = () => {
    if (!periodForm.name.trim()) {
      showToast('يرجى إدخال اسم الفعالية', 'warning');
      return;
    }

    if (editingPeriodId) {
      setPeriods(prev => prev.map(p => p.id === editingPeriodId ? {
        ...p,
        name: periodForm.name.trim(),
        afterPeriod: periodForm.afterPeriod,
        duration: periodForm.duration,
      } : p));
      showToast('تم تحديث الفعالية', 'success');
    } else {
      setPeriods(prev => [...prev, {
        id: `manual-${Date.now()}`,
        type: 'break',
        name: periodForm.name.trim(),
        isEnabled: true,
        afterPeriod: periodForm.afterPeriod,
        duration: periodForm.duration,
      }]);
      showToast('تم إضافة الفعالية', 'success');
    }

    setEditingPeriodId(null);
    setShowPeriodModal(false);
  };

  const deletePeriod = (id: string) => {
    setPeriods(prev => prev.filter(p => p.id !== id));
    setDeletePeriodId(null);
    showToast('تم حذف الفعالية', 'success');
  };

  const togglePeriod = (id: string) => {
    setPeriods(prev => prev.map(p => p.id === id ? { ...p, isEnabled: !p.isEnabled } : p));
  };

  return (
    <div className="flex flex-col gap-6">
      {(!activeView || activeView === 'locations') && (
        <div className={`${CARD_CLASS} order-2`}>
          <CardHeader
            icon={MapPin}
            title="مواقع الإشراف"
            description="إدارة وتصنيف أماكن الإشراف داخل المدرسة"
            action={
              <button
                onClick={() => { setEditingLocationId(null); setLocationName(''); setShowLocationModal(true); }}
                className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-sm font-bold bg-[#655ac1] hover:bg-[#8779fb] text-white shadow-md shadow-[#655ac1]/20 transition-all w-full sm:w-auto"
              >
                <Plus size={16} />
                إضافة موقع
              </button>
            }
          />

          <div className="overflow-x-auto rounded-2xl border border-slate-100">
            <table className="w-full text-right">
              <thead className="bg-white border-b text-sm text-[#655ac1]">
                <tr>
                  <th className="px-5 py-3 font-black w-16">م</th>
                  <th className="px-5 py-3 font-black min-w-[240px]">الموقع</th>
                  <th className="px-5 py-3 font-black text-center w-44">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {locations.map((loc, index) => (
                  <tr key={loc.id} className={`${loc.isActive ? 'hover:bg-gray-50' : 'bg-slate-50/50 opacity-70 hover:opacity-100'} transition-colors`}>
                    <td className="px-5 py-3 text-gray-400 text-sm">{index + 1}</td>
                    <td className="px-5 py-3 text-sm font-bold text-gray-800">{loc.name}</td>
                    <td className="px-5 py-3">
                      <div className="flex items-center justify-center gap-1">
                        <EditButton onClick={() => openEditLocation(loc)} />
                        <ToggleButton active={loc.isActive} onClick={() => toggleLocation(loc.id)} />
                        <button onClick={() => setDeleteLocationId(loc.id)} className="p-2 rounded-xl hover:bg-red-50 text-red-400 transition-colors" title="حذف">
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {(!activeView || activeView === 'periods') && (
        <div className={`${CARD_CLASS} order-1`}>
          <CardHeader
            icon={Clock}
            title="مواعيد الإشراف"
            description="ربط وتفعيل مواعيد الإشراف اليومي"
            action={
              <button
                onClick={() => openPeriodModal()}
                className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-sm font-bold bg-[#655ac1] hover:bg-[#8779fb] text-white shadow-md shadow-[#655ac1]/20 transition-all w-full sm:w-auto"
              >
                <Plus size={16} />
                إضافة فعالية
              </button>
            }
          />

          {!hasTimingData(schoolInfo) && (
            <div className="mb-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <AlertTriangle size={22} className="text-amber-500 shrink-0 mt-0.5" />
                <p className="text-sm font-bold text-amber-800 leading-7">
                  لم يتم تحديد مواعيد الفسحة أو مواعيد الصلاة ولا عددها ولا بعد أي حصة. يمكنك الانتقال لصفحة التوقيت أو إدخال فعالية يدويًا.
                </p>
              </div>
              {onNavigateToTiming && (
                <button
                  onClick={onNavigateToTiming}
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-sm font-black transition-colors shrink-0"
                >
                  الانتقال لصفحة التوقيت
                </button>
              )}
            </div>
          )}

          <div className="overflow-x-auto rounded-2xl border border-slate-100">
            <table className="w-full text-right">
              <thead className="bg-white border-b text-sm text-[#655ac1]">
                <tr>
                  <th className="px-5 py-3 font-black w-16">م</th>
                  <th className="px-5 py-3 font-black min-w-[180px]">اسم الفعالية</th>
                  <th className="px-5 py-3 font-black min-w-[170px]">موعد الفعالية</th>
                  <th className="px-5 py-3 font-black w-36">مدة الفعالية</th>
                  <th className="px-5 py-3 font-black text-center w-44">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {periods.map((period, index) => (
                  <tr key={period.id} className={`${period.isEnabled ? 'hover:bg-gray-50' : 'bg-slate-50/50 opacity-70 hover:opacity-100'} transition-colors`}>
                    <td className="px-5 py-3 text-gray-400 text-sm">{index + 1}</td>
                    <td className="px-5 py-3 text-sm font-bold text-gray-800">{period.name}</td>
                    <td className="px-5 py-3 text-sm text-slate-600">{getPeriodLabel(period)}</td>
                    <td className="px-5 py-3 text-sm font-bold text-slate-700">{period.duration || periodMeta.get(period.id)?.duration || 20} دقيقة</td>
                    <td className="px-5 py-3">
                      <div className="flex items-center justify-center gap-1">
                        <EditButton onClick={() => openPeriodModal(period)} />
                        <ToggleButton active={period.isEnabled} onClick={() => togglePeriod(period.id)} />
                        <button onClick={() => setDeletePeriodId(period.id)} className="p-2 rounded-xl hover:bg-red-50 text-red-400 transition-colors" title="حذف">
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {periods.length === 0 && (
              <div className="text-center py-10 text-slate-400 text-sm">لا توجد مواعيد إشراف مضافة</div>
            )}
          </div>
        </div>
      )}

      {showLocationModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg p-6">
            <div className="flex justify-between items-center mb-6 border-b pb-4">
              <h2 className="text-xl font-bold flex items-center gap-2">
                {editingLocationId ? <Edit3 className="w-5 h-5 text-[#655ac1]" /> : <Plus className="w-5 h-5 text-[#655ac1]" />}
                {editingLocationId ? 'تعديل موقع' : 'إضافة موقع'}
              </h2>
              <button onClick={() => setShowLocationModal(false)} className="p-2 bg-white border border-slate-300 hover:bg-slate-50 rounded-full text-slate-500 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <label className="block text-sm font-bold mb-1">اسم الموقع</label>
            <input
              type="text"
              value={locationName}
              onChange={e => setLocationName(e.target.value)}
              className="w-full p-2.5 border rounded-lg focus:ring-2 focus:ring-[#655ac1] outline-none"
              autoFocus
            />
            <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
              <button onClick={() => setShowLocationModal(false)} className="px-5 py-2.5 rounded-xl text-sm font-bold text-slate-600 bg-white border border-slate-300 hover:bg-slate-50">إغلاق</button>
              <button onClick={saveLocation} className="px-6 py-2.5 rounded-xl text-sm font-bold text-white bg-[#655ac1] hover:bg-[#5046a0] flex items-center gap-2">
                <Check size={16} />
                حفظ
              </button>
            </div>
          </div>
        </div>
      )}

      {showPeriodModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg p-6">
            <div className="flex justify-between items-center mb-6 border-b pb-4">
              <h2 className="text-xl font-bold flex items-center gap-2">
                {editingPeriodId ? <Edit3 className="w-5 h-5 text-[#655ac1]" /> : <Plus className="w-5 h-5 text-[#655ac1]" />}
                {editingPeriodId ? 'تعديل فعالية' : 'إضافة فعالية'}
              </h2>
              <button onClick={() => setShowPeriodModal(false)} className="p-2 bg-white border border-slate-300 hover:bg-slate-50 rounded-full text-slate-500 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold mb-1">اسم الفعالية</label>
                <input
                  type="text"
                  value={periodForm.name}
                  onChange={e => setPeriodForm(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full p-2.5 border rounded-lg focus:ring-2 focus:ring-[#655ac1] outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-bold mb-1">موعد الفعالية</label>
                <select
                  value={periodForm.afterPeriod}
                  onChange={e => setPeriodForm(prev => ({ ...prev, afterPeriod: Number(e.target.value) }))}
                  className="w-full p-2.5 border rounded-lg focus:ring-2 focus:ring-[#655ac1] outline-none bg-white"
                >
                  {PERIOD_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold mb-1">مدة الفعالية</label>
                <input
                  type="number"
                  min={1}
                  value={periodForm.duration}
                  onChange={e => setPeriodForm(prev => ({ ...prev, duration: Number(e.target.value) }))}
                  className="w-full p-2.5 border rounded-lg focus:ring-2 focus:ring-[#655ac1] outline-none"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
              <button onClick={() => setShowPeriodModal(false)} className="px-5 py-2.5 rounded-xl text-sm font-bold text-slate-600 bg-white border border-slate-300 hover:bg-slate-50">إغلاق</button>
              <button onClick={savePeriod} className="px-6 py-2.5 rounded-xl text-sm font-bold text-white bg-[#655ac1] hover:bg-[#5046a0] flex items-center gap-2">
                <Check size={16} />
                حفظ
              </button>
            </div>
          </div>
        </div>
      )}

      {(deleteLocationId || deletePeriodId) && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[10000] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-6 text-center">
            <div className="w-14 h-14 bg-rose-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Trash2 size={28} className="text-rose-500" />
            </div>
            <h2 className="text-xl font-black text-slate-800 mb-2">تأكيد الحذف</h2>
            <p className="text-sm font-medium text-slate-500 leading-7">هل أنت متأكد من حذف هذا السجل؟ لا يمكن التراجع عن هذا الإجراء.</p>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => { setDeleteLocationId(null); setDeletePeriodId(null); }}
                className="flex-1 px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-bold rounded-xl transition-colors"
              >
                إلغاء
              </button>
              <button
                onClick={() => deleteLocationId ? deleteLocation(deleteLocationId) : deletePeriodId && deletePeriod(deletePeriodId)}
                className="flex-1 px-4 py-3 bg-rose-500 hover:bg-rose-600 text-white text-sm font-bold rounded-xl transition-colors"
              >
                حذف
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SupervisionLocationsPanel;
