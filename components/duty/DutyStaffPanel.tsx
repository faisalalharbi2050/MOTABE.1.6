import React, { useState, useMemo } from 'react';
import {
  Users, UserCheck, UserX, Search, Filter, Shield,
  ToggleLeft, ToggleRight, Info, Clock, Send
} from 'lucide-react';
import {
  Teacher, Admin, DutyStaffExclusion, DutySettings
} from '../../types';
import { Badge } from '../ui/Badge';
import { getEligibleDutyAdminRoles } from '../../utils/dutyUtils';

interface Props {
  activeView?: 'settings' | 'staff';
  teachers: Teacher[];
  admins: Admin[];
  exclusions: DutyStaffExclusion[];
  setExclusions: (excs: DutyStaffExclusion[] | ((prev: DutyStaffExclusion[]) => DutyStaffExclusion[])) => void;
  settings: DutySettings;
  setSettings: (s: DutySettings | ((prev: DutySettings) => DutySettings)) => void;
  availableCount: number;
  suggestExclude: boolean;
  showToast: (msg: string, type: 'success' | 'warning' | 'error') => void;
}

const DutyStaffPanel: React.FC<Props> = ({
  teachers, admins, exclusions, setExclusions, settings, setSettings,
  availableCount, suggestExclude, showToast, activeView
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'teachers' | 'admins'>('all');

  // Build combined staff list
  const allStaff = useMemo(() => {
    const staff: { id: string; name: string; type: 'teacher' | 'admin'; role?: string; phone?: string }[] = [];

    teachers.forEach(t => {
      staff.push({ id: t.id, name: t.name, type: 'teacher', phone: t.phone });
    });

    admins.forEach(a => {
      staff.push({ id: a.id, name: a.name, type: 'admin', role: a.role, phone: a.phone });
    });

    return staff;
  }, [teachers, admins]);

  // Filter
  const filteredStaff = useMemo(() => {
    let list = allStaff;
    if (filterType === 'teachers') list = list.filter(s => s.type === 'teacher');
    if (filterType === 'admins') list = list.filter(s => s.type === 'admin');
    if (searchTerm.trim()) {
      const term = searchTerm.trim().toLowerCase();
      list = list.filter(s => s.name.toLowerCase().includes(term) || (s.role && s.role.toLowerCase().includes(term)));
    }
    return list;
  }, [allStaff, filterType, searchTerm]);

  // Exclusion helpers
  const isExcluded = (staffId: string) => {
    return exclusions.find(e => e.staffId === staffId)?.isExcluded || false;
  };

  const toggleExclusion = (staffId: string, staffType: 'teacher' | 'admin') => {
    const existing = exclusions.find(e => e.staffId === staffId);
    if (existing) {
      setExclusions(prev => prev.map(e => e.staffId === staffId ? { ...e, isExcluded: !e.isExcluded } : e));
    } else {
      setExclusions(prev => [...prev, { staffId, staffType, isExcluded: true }]);
    }
  };

  const excludedCount = exclusions.filter(e => e.isExcluded).length;

  // VP and Guard roles for auto-exclude display
  const vpRoles = ['وكيل', 'وكيلة', 'وكيل الشؤون التعليمية', 'وكيل الشؤون المدرسية'];
  const guardRoles = ['حارس', 'حارسة'];
  
  const vpAdmins = admins.filter(a => vpRoles.some(r => a.role?.includes(r)));
  const guardAdmins = admins.filter(a => guardRoles.some(r => a.role?.includes(r)));

  return (
    <div className="space-y-6">
      {/* Staff List */}
      {(!activeView || activeView === 'staff') && (
      <div className="bg-white rounded-[2rem] p-6 sm:p-8 shadow-sm border border-slate-100 h-full flex flex-col relative overflow-hidden">
        {/* Decorative background element */}
        <div className="absolute top-0 left-0 w-32 h-32 bg-gradient-to-br from-[#e5e1fe]/50 to-transparent rounded-br-full -z-0 pointer-events-none" />

        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-4">
             <div className="w-12 h-12 flex items-center justify-center bg-slate-100 text-[#655ac1] rounded-2xl shadow-sm">
               <Users size={24} />
             </div>
             <div>
                <h3 className="text-xl font-black text-[#655ac1] flex items-center gap-2">
                  المناوبون
                </h3>
                <p className="text-sm font-medium text-slate-500 mt-1">البحث، والفرز، واستثناء الموظفين من المناوبة</p>
             </div>
          </div>
          <div className="flex items-center gap-2 mr-auto">
             <Badge variant="info" className="px-3 py-1.5 text-[#655ac1] bg-[#e5e1fe] text-xs font-bold shadow-sm">{availableCount} متاح</Badge>
             {excludedCount > 0 && <Badge variant="warning" className="px-3 py-1.5 text-xs font-bold shadow-sm">{excludedCount} مستثنى</Badge>}
          </div>
        </div>

        {/* Search & Filter */}
        <div className="flex gap-2 mb-4">
          <div className="w-full sm:w-1/3 relative">
            <Search size={16} className="absolute right-3 top-3 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="بحث بالاسم أو المسمى..."
              className="w-full pr-10 pl-3 py-2.5 rounded-xl border border-slate-200 text-sm font-medium focus:ring-2 focus:ring-[#655ac1]/30 focus:border-[#655ac1] outline-none transition-all placeholder:text-slate-400 bg-white"
            />
          </div>
          <div className="flex-1 flex gap-2 flex-wrap sm:flex-nowrap bg-slate-100 rounded-2xl p-1.5 shrink-0 w-full sm:w-auto">
            {[
              { id: 'all', label: 'الكل' },
              { id: 'teachers', label: 'المعلمون' },
              { id: 'admins', label: 'الإداريون' },
            ].map(f => (
              <button
                key={f.id}
                onClick={() => setFilterType(f.id as any)}
                className={`flex-1 px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${
                  filterType === f.id ? 'bg-white text-[#655ac1] shadow-sm ring-1 ring-slate-200/50' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Staff List */}
        <div className="space-y-1.5 max-h-96 overflow-y-auto custom-scrollbar">
          {filteredStaff.length === 0 && (
            <div className="text-center py-8 text-slate-400 text-sm">
              لا يوجد موظفون مطابقون
            </div>
          )}
          {filteredStaff.map(staff => {
            const excluded = isExcluded(staff.id);
            const isVP = staff.type === 'admin' && vpRoles.some(r => staff.role?.includes(r));
            const isGuard = staff.type === 'admin' && guardRoles.some(r => staff.role?.includes(r));

            return (
              <div
                key={staff.id}
                className={`flex items-center gap-4 p-4 rounded-2xl border transition-all duration-200 group ${
                  excluded
                    ? 'bg-red-50/30 border-red-100 opacity-80 hover:opacity-100'
                    : 'bg-white border-slate-100 hover:border-[#655ac1]/30 hover:shadow-md'
                }`}
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-black shrink-0 shadow-sm ${
                  staff.type === 'teacher' ? 'bg-blue-50 text-blue-600' : 'bg-purple-50 text-purple-600'
                }`}>
                  {staff.type === 'teacher' ? 'م' : 'إ'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-slate-700 truncate">{staff.name}</p>
                  <p className="text-xs text-slate-400">
                    {staff.type === 'teacher' ? 'معلم' : staff.role || 'إداري'}
                    {isVP && settings.excludeVicePrincipals && (
                      <span className="text-[#8779fb] mr-1">(مستثنى تلقائياً - وكيل)</span>
                    )}
                    {isGuard && settings.excludeGuards && (
                      <span className="text-[#8779fb] mr-1">(مستثنى تلقائياً - حارس)</span>
                    )}
                  </p>
                </div>
                {excluded && <Badge variant="error">مستثنى</Badge>}
                {!excluded && !isVP && !isGuard && <Badge variant="success">متاح</Badge>}
                {isVP && settings.excludeVicePrincipals && <Badge variant="warning">وكيل</Badge>}
                {isGuard && settings.excludeGuards && <Badge variant="warning">حارس</Badge>}

                <button
                  onClick={() => toggleExclusion(staff.id, staff.type)}
                  className={`p-1.5 rounded-lg transition-colors ${
                    excluded
                      ? 'hover:bg-green-100 text-green-600'
                      : 'hover:bg-red-100 text-red-400'
                  }`}
                  title={excluded ? 'إلغاء الاستثناء' : 'استثناء'}
                >
                  {excluded ? <UserCheck size={16} /> : <UserX size={16} />}
                </button>
              </div>
            );
          })}
        </div>
      </div>
      )}

      {/* Settings */}
      {(!activeView || activeView === 'settings') && (
      <div className="bg-white rounded-[2rem] p-6 sm:p-8 shadow-sm border border-slate-100 relative overflow-hidden">
        {/* Decorative background element */}
        <div className="absolute top-0 left-0 w-32 h-32 bg-gradient-to-br from-slate-100/50 to-transparent rounded-br-full -z-0 pointer-events-none" />

        <div className="relative z-10 flex items-center justify-between w-full mb-6 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-4">
             <div className="w-12 h-12 flex items-center justify-center bg-slate-100 text-[#655ac1] rounded-2xl shadow-sm">
               <Shield size={24} />
             </div>
             <div className="text-right">
                <h3 className="text-xl font-black text-[#655ac1] flex items-center gap-2">إعدادات أساسية</h3>
                <p className="text-sm font-medium text-slate-500 mt-1">حدد الإعدادات الأساسية لإنشاء جدول المناوبة وتوزيع المهام.</p>
             </div>
          </div>
        </div>

          <div className="relative z-10 space-y-4 animate-in fade-in duration-500">
            {/* 1. Officers Count per Day */}
            <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50/80 border border-slate-100 hover:border-slate-200 transition-colors">
              <div>
                <p className="text-base font-bold text-slate-700">عدد المناوبين يوميًا</p>
                <p className="text-sm text-slate-500 mt-0.5">عدد موظفي المناوبة المطلوب تواجدهم كل يوم</p>
              </div>
              <div className="flex items-center gap-3 bg-white p-1 rounded-xl border border-slate-200 shadow-sm">
                <button
                  onClick={() => setSettings(prev => ({ ...prev, suggestedCountPerDay: Math.max(1, (prev.suggestedCountPerDay || 1) - 1) }))}
                  className="w-8 h-8 flex items-center justify-center bg-slate-50 hover:bg-slate-100 rounded-lg text-slate-600 font-bold transition-colors"
                >
                  -
                </button>
                <span className="w-8 text-center font-bold text-[#655ac1]">{settings.suggestedCountPerDay || 1}</span>
                <button
                  onClick={() => setSettings(prev => ({ ...prev, suggestedCountPerDay: (prev.suggestedCountPerDay || 1) + 1 }))}
                  className="w-8 h-8 flex items-center justify-center bg-slate-50 hover:bg-slate-100 rounded-lg text-slate-600 font-bold transition-colors"
                >
                  +
                </button>
              </div>
            </div>

            {/* 2. VP Auto Exclude */}
            <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50/80 border border-slate-100 hover:border-slate-200 transition-colors">
              <div>
                <p className="text-base font-bold text-slate-700">استثناء الوكلاء تلقائياً</p>
                <p className="text-sm text-slate-500 mt-0.5">تفعيل أو تعطيل إدراج الوكلاء في قائمة المناوبة</p>
              </div>
              <button 
                onClick={() => setSettings(prev => ({ ...prev, excludeVicePrincipals: !prev.excludeVicePrincipals }))}
                className="focus:outline-none transition-transform hover:scale-105 active:scale-95"
              >
                {settings.excludeVicePrincipals ? <ToggleRight size={32} className="text-green-500" /> : <ToggleLeft size={32} className="text-slate-300" />}
              </button>
            </div>

            {/* 3. Auto Exclude Teachers when 5+ admins */}
            <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50/80 border border-slate-100 hover:border-slate-200 transition-colors">
              <div>
                <p className="text-base font-bold text-slate-700">استثناء المعلمين عند وجود 5+ إداريين</p>
                <p className="text-sm text-slate-500 mt-0.5">عند وجود 5 مساعدين إداريين أو أكثر، يُستثنى المعلمون الممارسون</p>
              </div>
              <button 
                onClick={() => setSettings(prev => ({ ...prev, autoExcludeTeachersWhen5Admins: !prev.autoExcludeTeachersWhen5Admins }))}
                className="focus:outline-none transition-transform hover:scale-105 active:scale-95"
              >
                {settings.autoExcludeTeachersWhen5Admins ? <ToggleRight size={32} className="text-green-500" /> : <ToggleLeft size={32} className="text-slate-300" />}
              </button>
            </div>

            {/* 4. Shared School Mode */}
            <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50/80 border border-slate-100 hover:border-slate-200 transition-colors">
              <div>
                <p className="text-base font-bold text-slate-700">نمط المدارس المشتركة</p>
                <p className="text-sm text-slate-500 mt-0.5">جدول إشراف موحد أو منفصل لكل مدرسة</p>
              </div>
              <select
                value={settings.sharedSchoolMode}
                onChange={e => setSettings(prev => ({ ...prev, sharedSchoolMode: e.target.value as any }))}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-700 bg-white focus:ring-2 focus:ring-[#655ac1]/30 focus:border-[#655ac1] outline-none cursor-pointer hover:border-slate-300 transition-colors"
              >
                <option value="unified">موحد</option>
                <option value="separate">منفصل</option>
              </select>
            </div>

            {/* 4.5 Include Report Link in Reminder */}
            <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50/80 border border-slate-100 hover:border-slate-200 transition-colors">
              <div>
                <p className="text-base font-bold text-slate-700">تضمين رابط نموذج التقرير في رسالة التذكير</p>
                <p className="text-sm text-slate-500 mt-0.5">إضافة رابط نموذج التقرير اليومي للمناوب ضمن رسائل التذكير اليومية</p>
              </div>
              <button
                onClick={() => setSettings(prev => ({ ...prev, includeReportLinkInReminder: !(prev.includeReportLinkInReminder ?? true) }))}
                className="focus:outline-none transition-transform hover:scale-105 active:scale-95"
              >
                {(settings.includeReportLinkInReminder ?? true) ? <ToggleRight size={32} className="text-green-500" /> : <ToggleLeft size={32} className="text-slate-300" />}
              </button>
            </div>

            {/* 5. Send Links Settings */}
            <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50/80 border border-slate-100 hover:border-slate-200 transition-colors">
              <div>
                <p className="text-base font-bold text-slate-700">إرسال رابط التقرير يومياً</p>
                <p className="text-sm text-slate-500 mt-0.5">إرسال رابط المناوبة للمناوبين بطريقة تلقائية أو يدوية</p>
              </div>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 text-sm font-bold text-slate-700 cursor-pointer">
                  <input
                    type="radio"
                    name="autoSendLinks"
                    checked={settings.autoSendLinks}
                    onChange={() => setSettings(prev => ({ ...prev, autoSendLinks: true }))}
                    className="w-4 h-4 text-[#655ac1] focus:ring-[#655ac1]"
                  />
                  تلقائي
                </label>
                <label className="flex items-center gap-2 text-sm font-bold text-slate-700 cursor-pointer border-r pr-3 border-slate-300">
                  <input
                    type="radio"
                    name="autoSendLinks"
                    checked={!settings.autoSendLinks}
                    onChange={() => setSettings(prev => ({ ...prev, autoSendLinks: false }))}
                    className="w-4 h-4 text-[#655ac1] focus:ring-[#655ac1]"
                  />
                  يدوي
                </label>
              </div>
            </div>

            {/* 6. Send Time — disabled when manual */}
            <div className={`flex items-center justify-between p-4 rounded-2xl bg-slate-50/80 border border-slate-100 transition-colors ${settings.autoSendLinks ? 'hover:border-slate-200' : 'opacity-50 pointer-events-none'}`}>
              <div>
                <p className="text-base flex items-center gap-2 font-bold text-slate-700">
                  <Clock size={16} className="text-[#655ac1]" />
                  وقت إرسال رابط المناوبة
                </p>
                <p className="text-sm text-slate-500 mt-0.5">الوقت المفضل لإرسال رسائل التذكير</p>
              </div>
              <input
                type="time"
                value={settings.reminderSendTime || '08:00'}
                onChange={(e) => setSettings(prev => ({ ...prev, reminderSendTime: e.target.value }))}
                className="px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#655ac1]/30 focus:border-[#655ac1] font-bold text-slate-700"
              />
            </div>

            {/* 7. Send Channel — disabled when manual */}
            <div className={`flex items-center justify-between p-4 rounded-2xl bg-slate-50/80 border border-slate-100 transition-colors ${settings.autoSendLinks ? 'hover:border-slate-200' : 'opacity-50 pointer-events-none'}`}>
              <div>
                <p className="text-base font-bold text-slate-700">طريقة إرسال رسالة التذكير</p>
                <p className="text-sm text-slate-500 mt-0.5">اختر القناة المستخدمة عند الإرسال التلقائي</p>
              </div>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 text-sm font-bold text-slate-700 cursor-pointer">
                  <input
                    type="radio"
                    name="dutyReminderChannel"
                    checked={settings.reminderSendChannel === 'whatsapp'}
                    onChange={() => setSettings(prev => ({ ...prev, reminderSendChannel: 'whatsapp' }))}
                    className="w-4 h-4 text-[#25D366] focus:ring-[#25D366]"
                  />
                  <span className="flex items-center gap-1.5">
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="#25D366">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                    </svg>
                    واتساب
                  </span>
                </label>
                <label className="flex items-center gap-2 text-sm font-bold text-slate-700 cursor-pointer border-r pr-3 border-slate-300">
                  <input
                    type="radio"
                    name="dutyReminderChannel"
                    checked={settings.reminderSendChannel === 'sms'}
                    onChange={() => setSettings(prev => ({ ...prev, reminderSendChannel: 'sms' }))}
                    className="w-4 h-4 text-[#007AFF] focus:ring-[#007AFF]"
                  />
                  <span className="flex items-center gap-1.5">
                    <Send size={15} className="text-[#007AFF]" />
                    نصية
                  </span>
                </label>
              </div>
            </div>

            {/* VP & Guard list details */}
            {(vpAdmins.length > 0 || guardAdmins.length > 0) && (
              <div className="bg-violet-50/50 border -[#e5e1fe] rounded-xl p-3">
                <p className="text-xs font-bold text-[#655ac1] mb-2 flex items-center gap-1">
                  <Info size={14} />
                  الفئات المستثناة الإدارية تلقائياً
                </p>
                <div className="flex flex-wrap gap-2">
                  {settings.excludeVicePrincipals && vpAdmins.map(vp => (
                    <span key={vp.id} className="px-2 py-1 rounded-lg bg-white text-xs font-bold text-[#655ac1] border -[#e5e1fe]">
                      {vp.name} - {vp.role}
                    </span>
                  ))}
                  {settings.excludeGuards && guardAdmins.map(guard => (
                    <span key={guard.id} className="px-2 py-1 rounded-lg bg-white text-xs font-bold text-[#655ac1] border -[#e5e1fe]">
                      {guard.name} - {guard.role}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
      </div>
      )}
    </div>
  );
};

export default DutyStaffPanel;

