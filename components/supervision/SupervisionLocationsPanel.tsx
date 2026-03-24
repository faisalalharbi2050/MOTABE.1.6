import React, { useState } from 'react';
import {
  MapPin, Plus, Trash2, Edit, Check, X, GripVertical, Clock
} from 'lucide-react';

const Toggle: React.FC<{ checked: boolean; onChange: () => void }> = ({ checked, onChange }) => (
  <div className="flex items-center gap-2 shrink-0">
    <span className={`text-xs font-bold transition-colors duration-200 min-w-[2rem] text-center ${checked ? 'text-green-600' : 'text-slate-400'}`}>
      {checked ? 'مفعّل' : 'معطّل'}
    </span>
    <button
      onClick={onChange}
      className={`relative h-6 w-10 rounded-full transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-offset-1 ${
        checked ? 'bg-green-500 focus:ring-green-400' : 'bg-slate-200 focus:ring-slate-300'
      }`}
    >
      <span className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow-md transition-all duration-300 ${
        checked ? 'right-1' : 'left-1'
      }`} />
    </button>
  </div>
);
import {
  SchoolInfo, SupervisionLocation, SupervisionPeriodConfig
} from '../../types';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { LOCATION_CATEGORIES, FLOOR_NAMES, getTimingConfig } from '../../utils/supervisionUtils';

interface Props {
  activeView?: 'locations' | 'periods';
  locations: SupervisionLocation[];
  setLocations: (locs: SupervisionLocation[] | ((prev: SupervisionLocation[]) => SupervisionLocation[])) => void;
  periods: SupervisionPeriodConfig[];
  setPeriods: (p: SupervisionPeriodConfig[] | ((prev: SupervisionPeriodConfig[]) => SupervisionPeriodConfig[])) => void;
  schoolInfo: SchoolInfo;
  showToast: (msg: string, type: 'success' | 'warning' | 'error') => void;
}

const SupervisionLocationsPanel: React.FC<Props> = ({
  locations, setLocations, periods, setPeriods, schoolInfo, showToast, activeView
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [newLocName, setNewLocName] = useState('');
  const [newLocCategory, setNewLocCategory] = useState<string>('custom');
  const [newFloor, setNewFloor] = useState<number>(0);
  const [showAddForm, setShowAddForm] = useState(false);

  const timing = getTimingConfig(schoolInfo);

  const handleAdd = () => {
    if (!newLocName.trim()) {
      showToast('يُرجى إدخال اسم الموقع', 'warning');
      return;
    }
    const newLoc: SupervisionLocation = {
      id: `loc-${Date.now()}`,
      name: newLocName.trim(),
      category: newLocCategory as any,
      floorNumber: newLocCategory === 'floor' ? newFloor : undefined,
      isActive: true,
      sortOrder: locations.length + 1,
    };
    setLocations(prev => [...prev, newLoc]);
    setNewLocName('');
    setShowAddForm(false);
    showToast('تم إضافة الموقع', 'success');
  };

  const handleDelete = (id: string) => {
    setLocations(prev => prev.filter(l => l.id !== id));
    showToast('تم حذف الموقع', 'success');
  };

  const handleToggle = (id: string) => {
    setLocations(prev => prev.map(l => l.id === id ? { ...l, isActive: !l.isActive } : l));
  };

  const handleSaveEdit = (id: string) => {
    if (!editName.trim()) return;
    setLocations(prev => prev.map(l => l.id === id ? { ...l, name: editName.trim() } : l));
    setEditingId(null);
    showToast('تم تحديث الموقع', 'success');
  };

  const handleTogglePeriod = (id: string) => {
    setPeriods(prev => prev.map(p => p.id === id ? { ...p, isEnabled: !p.isEnabled } : p));
  };

  const getCategoryIcon = (cat: string) => {
    return LOCATION_CATEGORIES.find(c => c.id === cat)?.icon || '📍';
  };

  return (
    <div className="space-y-6">
      {/* Locations Section */}
      {(!activeView || activeView === 'locations') && (
      <div className="bg-white rounded-[2rem] p-6 sm:p-8 shadow-sm border border-slate-100 h-full flex flex-col relative overflow-hidden">
        {/* Decorative background element */}
        <div className="absolute top-0 left-0 w-32 h-32 bg-gradient-to-br from-[#e5e1fe]/50 to-transparent rounded-br-full -z-0 pointer-events-none" />

        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-4">
             <div className="w-12 h-12 flex items-center justify-center bg-slate-100 text-[#655ac1] rounded-2xl shadow-sm">
               <MapPin size={24} />
             </div>
             <div>
                <h3 className="text-xl font-black text-[#655ac1]">مواقع الإشراف</h3>
                <p className="text-sm font-medium text-slate-500 mt-1">إدارة وتصنيف أماكن الإشراف داخل المدرسة</p>
             </div>
          </div>
          <button 
             onClick={() => setShowAddForm(!showAddForm)}
             className={`flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all duration-300 w-full sm:w-auto ${
                 showAddForm ? 'bg-slate-100 text-slate-600 hover:bg-slate-200' : 'bg-[#655ac1] hover:bg-[#8779fb] text-white shadow-md shadow-[#655ac1]/20 hover:scale-105 active:scale-95'
             }`}
          >
             {showAddForm ? <X size={16} /> : <Plus size={16} />}
             <span>{showAddForm ? 'إلغاء الإضافة' : 'إضافة موقع'}</span>
          </button>
        </div>

        {showAddForm && (
          <div className="relative z-10 bg-slate-50/80 rounded-2xl p-5 mb-6 border border-slate-100 space-y-4 animate-in fade-in slide-in-from-top-4 duration-300">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-bold text-slate-600 mb-1.5 block">اسم الموقع</label>
                <input
                  type="text"
                  value={newLocName}
                  onChange={e => setNewLocName(e.target.value)}
                  placeholder="مثال: الممر الغربي"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-medium focus:ring-2 focus:ring-[#655ac1]/30 focus:border-[#655ac1] outline-none transition-all placeholder:text-slate-300 bg-white"
                />
              </div>
              <div>
                <label className="text-sm font-bold text-slate-600 mb-1.5 block">التصنيف</label>
                <select
                  value={newLocCategory}
                  onChange={e => setNewLocCategory(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-medium focus:ring-2 focus:ring-[#655ac1]/30 focus:border-[#655ac1] outline-none transition-all bg-white cursor-pointer"
                >
                  {LOCATION_CATEGORIES.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.icon} {cat.name}</option>
                  ))}
                </select>
              </div>
            </div>
            {newLocCategory === 'floor' && (
              <div className="animate-in fade-in duration-300">
                <label className="text-sm font-bold text-slate-600 mb-1.5 block">رقم الدور</label>
                <select
                  value={newFloor}
                  onChange={e => setNewFloor(Number(e.target.value))}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-medium focus:ring-2 focus:ring-[#655ac1]/30 focus:border-[#655ac1] outline-none transition-all bg-white cursor-pointer"
                >
                  {Object.entries(FLOOR_NAMES).map(([num, name]) => (
                    <option key={num} value={num}>{name}</option>
                  ))}
                </select>
              </div>
            )}
            <div className="flex gap-3 justify-end mt-6 pt-4 border-t border-slate-100">
              <button onClick={() => setShowAddForm(false)} className="px-6 py-2.5 rounded-xl text-sm font-bold text-slate-600 bg-slate-200 hover:bg-slate-300 transition-colors w-full sm:w-auto">إلغاء</button>
              <button onClick={handleAdd} className="flex items-center justify-center gap-2 px-8 py-2.5 rounded-xl text-sm font-bold text-white bg-green-500 hover:bg-green-600 transition-all shadow-md shadow-green-500/20 hover:scale-105 active:scale-95 w-full sm:w-auto">
                <Check size={18} /> إضافة
              </button>
            </div>
          </div>
        )}

        {/* Locations List */}
        <div className="space-y-3">
          {locations.length === 0 && (
            <div className="text-center py-8 text-slate-400 text-sm">
              لا توجد مواقع - أضف مواقع الإشراف
            </div>
          )}
          {locations.map(loc => (
            <div
              key={loc.id}
              className={`flex items-center gap-4 p-4 rounded-2xl border transition-all duration-200 group ${
                loc.isActive
                  ? 'bg-white border-slate-100 hover:border-[#655ac1]/30 hover:shadow-md'
                  : 'bg-slate-50/50 border-slate-100 opacity-70 hover:opacity-100'
              }`}
            >
              <GripVertical size={16} className="text-slate-300 cursor-grab shrink-0" />
              <span className="text-lg shrink-0">{getCategoryIcon(loc.category)}</span>
              {editingId === loc.id ? (
                <input
                  type="text"
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSaveEdit(loc.id)}
                  className="flex-1 px-2 py-1 rounded border border-[#655ac1] text-sm outline-none"
                  autoFocus
                />
              ) : (
                <span className="flex-1 text-sm font-bold text-slate-700">{loc.name}</span>
              )}
<div className="flex items-center gap-1">
                {editingId === loc.id ? (
                  <>
                    <button onClick={() => handleSaveEdit(loc.id)} className="p-2 rounded-xl hover:bg-green-50 text-green-600 border border-transparent hover:border-green-100 transition-colors">
                      <Check size={18} />
                    </button>
                    <button onClick={() => setEditingId(null)} className="p-2 rounded-xl hover:bg-red-50 text-red-500 border border-transparent hover:border-red-100 transition-colors">
                      <X size={18} />
                    </button>
                  </>
                ) : (
                  <>
                    <button onClick={() => { setEditingId(loc.id); setEditName(loc.name); }} className="p-2 rounded-xl hover:bg-slate-100 text-slate-500 border border-transparent hover:border-slate-200 transition-colors">
                      <Edit size={18} />
                    </button>
                    <Toggle checked={loc.isActive} onChange={() => handleToggle(loc.id)} />
                    <button onClick={() => handleDelete(loc.id)} className="p-2 rounded-xl hover:bg-red-50 text-red-400 border border-transparent hover:border-red-100 transition-colors">
                      <Trash2 size={18} />
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
      )}

      {/* Supervision Periods Section */}
      {(!activeView || activeView === 'periods') && (
      <div className="bg-white rounded-[2rem] p-6 sm:p-8 shadow-sm border border-slate-100 relative overflow-hidden">
        {/* Decorative background element */}
        <div className="absolute top-0 left-0 w-32 h-32 bg-gradient-to-br from-slate-100/50 to-transparent rounded-br-full -z-0 pointer-events-none" />

        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
           <div className="flex items-center gap-4">
               <div className="w-12 h-12 flex items-center justify-center bg-slate-100 text-[#655ac1] rounded-2xl shadow-sm">
                 <Clock size={24} />
               </div>
               <div>
                  <h3 className="text-xl font-black text-[#655ac1]">فترات الإشراف</h3>
                  <p className="text-sm font-medium text-slate-500 mt-1">ربط وتفعيل فترات الإشراف المستخرجة من التوقيت</p>
               </div>
           </div>
           <div className="flex items-center gap-2 mr-auto">
             <Badge variant="info" className="px-3 py-1.5 text-[#655ac1] bg-[#e5e1fe] text-xs font-bold shadow-sm">{periods.filter(p => p.isEnabled).length} مفعّلة</Badge>
           </div>
        </div>

        <div className="space-y-2">
          {periods.length === 0 ? (
            <div className="text-center py-6 text-slate-400 text-sm">
              <Clock size={32} className="mx-auto mb-2 text-slate-300" />
              لم يتم الربط مع بيانات التوقيت بعد
              <br />
              <span className="text-xs">يُرجى إعداد التوقيت من البيانات الأساسية</span>
            </div>
          ) : (
            periods.map(period => (
              <div
                key={period.id}
                className={`relative z-10 flex items-center justify-between p-4 rounded-2xl border transition-all duration-200 hover:shadow-sm ${
                  period.isEnabled
                    ? 'bg-white border-slate-100 hover:border-[#655ac1]/30'
                    : 'bg-slate-50/50 border-slate-100 opacity-70 hover:opacity-100'
                }`}
              >
                <div className="flex items-center gap-4">
                  <span className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg shadow-sm ${
                    period.type === 'break' ? 'bg-orange-50/80 text-orange-600' : 'bg-emerald-50/80 text-emerald-600'
                  }`}>
                    {period.type === 'break' ? '☕' : '🕌'}
                  </span>
                  <div>
                    <p className="text-sm font-bold text-slate-700">{period.name}</p>
                    <p className="text-xs text-slate-400">
                      {period.type === 'break' ? 'فسحة' : 'صلاة'}
                      {period.duration ? ` • ${period.duration} دقيقة` : ''}
                    </p>
                  </div>
                </div>
                <Toggle checked={period.isEnabled} onChange={() => handleTogglePeriod(period.id)} />
              </div>
            ))
          )}
        </div>
      </div>
      )}
    </div>
  );
};

export default SupervisionLocationsPanel;
