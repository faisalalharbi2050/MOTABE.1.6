import React, { useMemo, useState } from 'react';
import {
  AlertTriangle, Check, CheckCircle2, Clock, Edit3, MapPin, Plus, Trash2, X
} from 'lucide-react';
import {
  SchoolInfo, SupervisionLocation, SupervisionPeriodConfig
} from '../../types';
import { getTimingConfig, hasTimingData } from '../../utils/supervisionUtils';
import { Switch, CheckDropdown } from './controls';
import ConfirmDialog from '../ui/ConfirmDialog';

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

// حقل بنفس تصميمه الطبيعي مع تأثير تركيز خفيف للدلالة على الكتابة (لا رمادي ولا بنفسجي صريح)
const FIELD_CLASS = 'w-full p-2.5 border border-slate-200 rounded-lg outline-none focus:border-[#655ac1]/40 focus:ring-2 focus:ring-[#655ac1]/10 transition-all text-sm';
const INLINE_FIELD_CLASS = 'w-full px-3 py-1.5 border border-slate-200 rounded-lg text-[13px] font-bold text-slate-800 outline-none focus:border-[#655ac1]/40 focus:ring-2 focus:ring-[#655ac1]/10 transition-all';

const EditIconButton: React.FC<{ onClick: () => void; title?: string }> = ({ onClick, title = 'تعديل' }) => (
  <button
    onClick={onClick}
    className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 text-slate-400 hover:text-[#655ac1] hover:border-[#655ac1] transition-all"
    title={title}
  >
    <Edit3 size={14} />
  </button>
);

const SaveIconButton: React.FC<{ onClick: () => void }> = ({ onClick }) => (
  <button
    onClick={onClick}
    className="w-8 h-8 flex items-center justify-center rounded-lg bg-emerald-500 text-white hover:bg-emerald-600 transition-all"
    title="حفظ"
  >
    <CheckCircle2 size={16} />
  </button>
);

const CancelIconButton: React.FC<{ onClick: () => void }> = ({ onClick }) => (
  <button
    onClick={onClick}
    className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 text-slate-400 hover:text-slate-600 transition-all"
    title="إلغاء"
  >
    <X size={14} />
  </button>
);

const DeleteIconButton: React.FC<{ onClick: () => void }> = ({ onClick }) => (
  <button
    onClick={onClick}
    className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 text-rose-400 hover:text-rose-600 hover:bg-rose-50 hover:border-rose-200 transition-all"
    title="حذف"
  >
    <Trash2 size={14} />
  </button>
);

const CardHeader: React.FC<{ icon: React.ElementType; title: string; description: string; action?: React.ReactNode }> = ({
  icon: Icon, title, description, action
}) => (
  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
    <div className="flex items-center gap-3">
      <Icon size={24} strokeWidth={1.8} className="text-[#655ac1] shrink-0" />
      <div>
        <h3 className="text-base font-black text-slate-800">{title}</h3>
        <p className="text-xs font-medium text-slate-500 mt-1">{description}</p>
      </div>
    </div>
    {action}
  </div>
);

const CARD_CLASS = "bg-white rounded-[2rem] p-5 shadow-sm border-2 border-slate-200";
const TH_CLASS = "px-4 py-3.5 font-black";
const SerialBadge: React.FC<{ n: number }> = ({ n }) => (
  <span className="text-xs font-bold text-slate-400 bg-slate-50 w-6 h-6 inline-flex items-center justify-center rounded-full">{n}</span>
);

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
  // الإضافة عبر نافذة
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [showPeriodModal, setShowPeriodModal] = useState(false);
  const [newLocationName, setNewLocationName] = useState('');
  const [newPeriodForm, setNewPeriodForm] = useState({ name: '', afterPeriod: 1, duration: 20 });

  // التعديل داخل الصف
  const [editingLocationId, setEditingLocationId] = useState<string | null>(null);
  const [editLocationName, setEditLocationName] = useState('');
  const [editingPeriodId, setEditingPeriodId] = useState<string | null>(null);
  const [editPeriodForm, setEditPeriodForm] = useState({ name: '', afterPeriod: 1, duration: 20 });

  // الحذف
  const [deleteLocationId, setDeleteLocationId] = useState<string | null>(null);
  const [deletePeriodId, setDeletePeriodId] = useState<string | null>(null);

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

  // ── المواقع ──
  const addLocation = () => {
    if (!newLocationName.trim()) { showToast('يرجى إدخال اسم الموقع', 'warning'); return; }
    setLocations(prev => [...prev, {
      id: `loc-${Date.now()}`,
      name: newLocationName.trim(),
      category: 'custom',
      isActive: true,
      sortOrder: prev.length + 1,
    }]);
    showToast('تم إضافة الموقع', 'success');
    setNewLocationName('');
    setShowLocationModal(false);
  };

  const startEditLocation = (loc: SupervisionLocation) => {
    setEditingLocationId(loc.id);
    setEditLocationName(loc.name);
  };

  const saveEditLocation = () => {
    if (!editLocationName.trim()) { showToast('يرجى إدخال اسم الموقع', 'warning'); return; }
    setLocations(prev => prev.map(l => l.id === editingLocationId ? { ...l, name: editLocationName.trim() } : l));
    showToast('تم تحديث الموقع', 'success');
    setEditingLocationId(null);
  };

  const deleteLocation = (id: string) => {
    setLocations(prev => prev.filter(l => l.id !== id));
    setDeleteLocationId(null);
    showToast('تم حذف الموقع', 'success');
  };

  const toggleLocation = (id: string) => {
    setLocations(prev => prev.map(l => l.id === id ? { ...l, isActive: !l.isActive } : l));
  };

  // ── المواعيد ──
  const addPeriod = () => {
    if (!newPeriodForm.name.trim()) { showToast('يرجى إدخال اسم الفعالية', 'warning'); return; }
    setPeriods(prev => [...prev, {
      id: `manual-${Date.now()}`,
      type: 'break',
      name: newPeriodForm.name.trim(),
      isEnabled: true,
      afterPeriod: newPeriodForm.afterPeriod,
      duration: newPeriodForm.duration,
    }]);
    showToast('تم إضافة الفعالية', 'success');
    setNewPeriodForm({ name: '', afterPeriod: 1, duration: 20 });
    setShowPeriodModal(false);
  };

  const startEditPeriod = (period: SupervisionPeriodConfig) => {
    setEditingPeriodId(period.id);
    setEditPeriodForm({
      name: period.name,
      afterPeriod: getAfterPeriod(period) || 1,
      duration: period.duration || periodMeta.get(period.id)?.duration || 20,
    });
  };

  const saveEditPeriod = () => {
    if (!editPeriodForm.name.trim()) { showToast('يرجى إدخال اسم الفعالية', 'warning'); return; }
    setPeriods(prev => prev.map(p => p.id === editingPeriodId ? {
      ...p,
      name: editPeriodForm.name.trim(),
      afterPeriod: editPeriodForm.afterPeriod,
      duration: editPeriodForm.duration,
    } : p));
    showToast('تم تحديث الفعالية', 'success');
    setEditingPeriodId(null);
  };

  const deletePeriod = (id: string) => {
    setPeriods(prev => prev.filter(p => p.id !== id));
    setDeletePeriodId(null);
    showToast('تم حذف الفعالية', 'success');
  };

  const addButtonClass = "flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-sm font-bold bg-[#655ac1] hover:bg-[#655ac1] text-white shadow-md shadow-[#655ac1]/20 transition-all w-full sm:w-auto";

  return (
    <div className="flex flex-col gap-6">
      {(!activeView || activeView === 'locations') && (
        <div className={`${CARD_CLASS} order-2`}>
          <CardHeader
            icon={MapPin}
            title="مواقع الإشراف"
            description="إدارة وتصنيف أماكن الإشراف داخل المدرسة"
            action={
              <button onClick={() => { setNewLocationName(''); setShowLocationModal(true); }} className={addButtonClass}>
                <Plus size={16} />
                إضافة موقع
              </button>
            }
          />

          <div className="overflow-x-auto rounded-2xl border border-slate-100">
            <table className="w-full text-right">
              <thead className="bg-white border-b border-slate-200 text-xs text-[#655ac1]">
                <tr>
                  <th className={`${TH_CLASS} w-16 text-center`}>م</th>
                  <th className={`${TH_CLASS} min-w-[240px]`}>الموقع</th>
                  <th className={`${TH_CLASS} text-center w-48`}>إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {locations.map((loc, index) => {
                  const editing = editingLocationId === loc.id;
                  return (
                    <tr key={loc.id} className={`${loc.isActive ? 'hover:bg-[#e5e1fe]/10' : 'bg-slate-50/50 opacity-70 hover:opacity-100'} transition-colors`}>
                      <td className="px-4 py-2.5 text-center"><SerialBadge n={index + 1} /></td>
                      <td className="px-4 py-2.5">
                        {editing ? (
                          <input
                            value={editLocationName}
                            onChange={e => setEditLocationName(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') saveEditLocation(); if (e.key === 'Escape') setEditingLocationId(null); }}
                            className={INLINE_FIELD_CLASS}
                            autoFocus
                          />
                        ) : (
                          <span className="text-[13px] font-bold text-slate-800">{loc.name}</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center justify-center gap-1">
                          {editing ? (
                            <>
                              <SaveIconButton onClick={saveEditLocation} />
                              <CancelIconButton onClick={() => setEditingLocationId(null)} />
                            </>
                          ) : (
                            <>
                              <Switch checked={loc.isActive} onChange={() => toggleLocation(loc.id)} />
                              <EditIconButton onClick={() => startEditLocation(loc)} />
                              <DeleteIconButton onClick={() => setDeleteLocationId(loc.id)} />
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {locations.length === 0 && (
              <div className="text-center py-10 text-slate-400 text-sm">لا توجد مواقع مضافة</div>
            )}
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
              <button onClick={() => { setNewPeriodForm({ name: '', afterPeriod: 1, duration: 20 }); setShowPeriodModal(true); }} className={addButtonClass}>
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

          <div className="rounded-2xl border border-slate-100">
            <table className="w-full text-right">
              <thead className="bg-white border-b border-slate-200 text-xs text-[#655ac1]">
                <tr>
                  <th className={`${TH_CLASS} w-16 text-center`}>م</th>
                  <th className={`${TH_CLASS} min-w-[180px]`}>اسم الفعالية</th>
                  <th className={`${TH_CLASS} min-w-[180px]`}>موعد الفعالية</th>
                  <th className={`${TH_CLASS} w-40`}>مدة الفعالية</th>
                  <th className={`${TH_CLASS} text-center w-48`}>إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {periods.map((period, index) => {
                  const editing = editingPeriodId === period.id;
                  return (
                    <tr key={period.id} className="hover:bg-[#e5e1fe]/10 transition-colors">
                      <td className="px-4 py-2.5 text-center"><SerialBadge n={index + 1} /></td>
                      <td className="px-4 py-2.5">
                        {editing ? (
                          <input
                            value={editPeriodForm.name}
                            onChange={e => setEditPeriodForm(prev => ({ ...prev, name: e.target.value }))}
                            className={INLINE_FIELD_CLASS}
                            autoFocus
                          />
                        ) : (
                          <span className="text-[13px] font-bold text-slate-800">{period.name}</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5">
                        {editing ? (
                          <CheckDropdown<number>
                            className="min-w-[170px]"
                            value={editPeriodForm.afterPeriod}
                            onChange={v => setEditPeriodForm(prev => ({ ...prev, afterPeriod: v }))}
                            options={PERIOD_OPTIONS}
                          />
                        ) : (
                          <span className="text-[13px] font-medium text-slate-500">{getPeriodLabel(period)}</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5">
                        {editing ? (
                          <input
                            type="number"
                            min={1}
                            value={editPeriodForm.duration}
                            onChange={e => setEditPeriodForm(prev => ({ ...prev, duration: Number(e.target.value) }))}
                            className={`${INLINE_FIELD_CLASS} w-24`}
                          />
                        ) : (
                          <span className="text-[13px] font-medium text-slate-500">{period.duration || periodMeta.get(period.id)?.duration || 20} دقيقة</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center justify-center gap-1">
                          {editing ? (
                            <>
                              <SaveIconButton onClick={saveEditPeriod} />
                              <CancelIconButton onClick={() => setEditingPeriodId(null)} />
                            </>
                          ) : (
                            <>
                              <EditIconButton onClick={() => startEditPeriod(period)} />
                              <DeleteIconButton onClick={() => setDeletePeriodId(period.id)} />
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {periods.length === 0 && (
              <div className="text-center py-10 text-slate-400 text-sm">لا توجد مواعيد إشراف مضافة</div>
            )}
          </div>
        </div>
      )}

      {/* نافذة إضافة موقع */}
      {showLocationModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg p-6">
            <div className="flex justify-between items-center mb-6 border-b pb-4">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Plus className="w-5 h-5 text-[#655ac1]" />
                إضافة موقع
              </h2>
              <button onClick={() => setShowLocationModal(false)} className="p-2 bg-white border border-slate-300 hover:bg-slate-50 rounded-full text-slate-500 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <label className="block text-sm font-bold mb-1">اسم الموقع</label>
            <input
              type="text"
              value={newLocationName}
              onChange={e => setNewLocationName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') addLocation(); }}
              className={FIELD_CLASS}
              autoFocus
            />
            <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
              <button onClick={() => setShowLocationModal(false)} className="px-5 py-2.5 rounded-xl text-sm font-bold text-slate-600 bg-white border border-slate-300 hover:bg-slate-50">إغلاق</button>
              <button onClick={addLocation} className="px-6 py-2.5 rounded-xl text-sm font-bold text-white bg-[#655ac1] hover:bg-[#5046a0] flex items-center gap-2">
                <CheckCircle2 size={16} />
                إضافة
              </button>
            </div>
          </div>
        </div>
      )}

      {/* نافذة إضافة فعالية */}
      {showPeriodModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg p-6">
            <div className="flex justify-between items-center mb-6 border-b pb-4">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Plus className="w-5 h-5 text-[#655ac1]" />
                إضافة فعالية
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
                  value={newPeriodForm.name}
                  onChange={e => setNewPeriodForm(prev => ({ ...prev, name: e.target.value }))}
                  className={FIELD_CLASS}
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-bold mb-1">موعد الفعالية</label>
                <CheckDropdown<number>
                  value={newPeriodForm.afterPeriod}
                  onChange={v => setNewPeriodForm(prev => ({ ...prev, afterPeriod: v }))}
                  options={PERIOD_OPTIONS}
                />
              </div>
              <div>
                <label className="block text-sm font-bold mb-1">مدة الفعالية</label>
                <input
                  type="number"
                  min={1}
                  value={newPeriodForm.duration}
                  onChange={e => setNewPeriodForm(prev => ({ ...prev, duration: Number(e.target.value) }))}
                  className={FIELD_CLASS}
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
              <button onClick={() => setShowPeriodModal(false)} className="px-5 py-2.5 rounded-xl text-sm font-bold text-slate-600 bg-white border border-slate-300 hover:bg-slate-50">إغلاق</button>
              <button onClick={addPeriod} className="px-6 py-2.5 rounded-xl text-sm font-bold text-white bg-[#655ac1] hover:bg-[#5046a0] flex items-center gap-2">
                <CheckCircle2 size={16} />
                إضافة
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={!!deleteLocationId}
        tone="danger"
        title="تأكيد حذف الموقع"
        message="هل أنت متأكد من حذف هذا الموقع؟ لا يمكن التراجع عن هذا الإجراء."
        confirmLabel="حذف"
        cancelLabel="إلغاء"
        onConfirm={() => deleteLocationId && deleteLocation(deleteLocationId)}
        onCancel={() => setDeleteLocationId(null)}
      />

      <ConfirmDialog
        isOpen={!!deletePeriodId}
        tone="danger"
        title="تأكيد حذف الفعالية"
        message="هل أنت متأكد من حذف هذه الفعالية؟ لا يمكن التراجع عن هذا الإجراء."
        confirmLabel="حذف"
        cancelLabel="إلغاء"
        onConfirm={() => deletePeriodId && deletePeriod(deletePeriodId)}
        onCancel={() => setDeletePeriodId(null)}
      />
    </div>
  );
};

export default SupervisionLocationsPanel;
