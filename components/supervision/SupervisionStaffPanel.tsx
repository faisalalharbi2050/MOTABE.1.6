import React, { useMemo, useState } from 'react';
import { Bell, MessageSquare, Power, Search, Settings, Users } from 'lucide-react';
import {
  Teacher, Admin, SupervisionStaffExclusion, SupervisionSettings
} from '../../types';

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
      <span className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow-md transition-all duration-300 ${checked ? 'right-1' : 'left-1'}`} />
    </button>
  </div>
);

const PowerToggle: React.FC<{ checked: boolean; onChange: () => void }> = ({ checked, onChange }) => (
  <button
    onClick={onChange}
    className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-black transition-all active:scale-95 ${
      checked
        ? 'bg-green-50 text-green-700 border-green-200 shadow-sm shadow-green-100 hover:bg-green-100'
        : 'bg-slate-50 text-slate-400 border-slate-200 hover:bg-slate-100 hover:text-slate-600'
    }`}
    title={checked ? 'تعطيل' : 'تفعيل'}
  >
    <Power size={16} />
    <span>{checked ? 'مفعّل' : 'معطّل'}</span>
  </button>
);

const WhatsAppIcon = ({ size = 16 }: { size?: number }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="#25D366">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
  </svg>
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

const SettingRow: React.FC<{ title: string; hint?: string; children: React.ReactNode; disabled?: boolean }> = ({
  title, hint, children, disabled
}) => (
  <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-4 border-b border-slate-100 last:border-b-0 transition-colors ${disabled ? 'opacity-50' : ''}`}>
    <div>
      <p className="text-sm font-bold text-slate-700">{title}</p>
      {hint && <p className="text-xs text-slate-400 mt-1">{hint}</p>}
    </div>
    {children}
  </div>
);

interface Props {
  activeView?: 'settings' | 'staff' | 'reminders';
  teachers: Teacher[];
  admins: Admin[];
  exclusions: SupervisionStaffExclusion[];
  setExclusions: (excs: SupervisionStaffExclusion[] | ((prev: SupervisionStaffExclusion[]) => SupervisionStaffExclusion[])) => void;
  settings: SupervisionSettings;
  setSettings: (s: SupervisionSettings | ((prev: SupervisionSettings) => SupervisionSettings)) => void;
  availableCount: number;
  suggestExclude: boolean;
  hasSharedSchools?: boolean;
  showToast: (msg: string, type: 'success' | 'warning' | 'error') => void;
}

const SupervisionStaffPanel: React.FC<Props> = ({
  teachers, admins, exclusions, setExclusions, settings, setSettings,
  hasSharedSchools, activeView
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'teachers' | 'admins'>('all');

  const allStaff = useMemo(() => ([
    ...teachers.map(t => ({ id: t.id, name: t.name, type: 'teacher' as const })),
    ...admins.map(a => ({ id: a.id, name: a.name, type: 'admin' as const })),
  ]), [teachers, admins]);

  const counts = {
    all: allStaff.length,
    teachers: allStaff.filter(s => s.type === 'teacher').length,
    admins: allStaff.filter(s => s.type === 'admin').length,
  };

  const filteredStaff = useMemo(() => {
    let list = allStaff;
    if (filterType === 'teachers') list = list.filter(s => s.type === 'teacher');
    if (filterType === 'admins') list = list.filter(s => s.type === 'admin');
    if (searchTerm.trim()) {
      const term = searchTerm.trim().toLowerCase();
      list = list.filter(s => s.name.toLowerCase().includes(term));
    }
    return list;
  }, [allStaff, filterType, searchTerm]);

  const isExcluded = (staffId: string) => exclusions.find(e => e.staffId === staffId)?.isExcluded || false;

  const setExclusionState = (staffId: string, staffType: 'teacher' | 'admin', excluded: boolean) => {
    setExclusions(prev => {
      const existing = prev.find(e => e.staffId === staffId);
      if (existing) return prev.map(e => e.staffId === staffId ? { ...e, isExcluded: excluded } : e);
      return [...prev, { staffId, staffType, isExcluded: excluded }];
    });
  };

  return (
    <div className="space-y-6">
      {activeView === 'staff' && (
        <div className={CARD_CLASS}>
          <CardHeader
            icon={Users}
            title="المشرفون"
            description="البحث واستثناء الموظفين من الإشراف اليومي"
          />

          <div className="flex flex-col lg:flex-row gap-3 mb-4">
            <div className="w-full lg:w-80 relative">
              <Search size={16} className="absolute right-3 top-3 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="بحث بالاسم"
                className="w-full pr-10 pl-3 py-2.5 rounded-xl border border-slate-200 text-sm font-medium focus:ring-2 focus:ring-[#655ac1]/30 focus:border-[#655ac1] outline-none transition-all placeholder:text-slate-400 bg-white"
              />
            </div>
            <div className="grid grid-cols-3 gap-1 bg-slate-50 p-1 rounded-xl flex-1">
              {[
                { id: 'all', label: 'الكل', count: counts.all },
                { id: 'teachers', label: 'المعلمون', count: counts.teachers },
                { id: 'admins', label: 'الإداريون', count: counts.admins },
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setFilterType(tab.id as typeof filterType)}
                  className={`px-2 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all border ${
                    filterType === tab.id ? 'bg-white text-[#8779fb] shadow-sm border-slate-200' : 'text-slate-400 hover:text-slate-600 border-transparent'
                  }`}
                >
                  {tab.label} <span className="font-black">({tab.count})</span>
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-100">
            <table className="w-full text-right">
              <thead className="bg-white border-b text-sm text-[#655ac1]">
                <tr>
                  <th className="px-5 py-3 font-black w-16">م</th>
                  <th className="px-5 py-3 font-black w-[260px]">اسم الموظف</th>
                  <th className="px-5 py-3 font-black w-28">الصفة</th>
                  <th className="px-5 py-3 font-black text-left w-40">الحالة</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredStaff.map((staff, index) => {
                  const excluded = isExcluded(staff.id);
                  return (
                    <tr key={staff.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-3 text-gray-400 text-sm">{index + 1}</td>
                      <td className="px-5 py-3 text-sm font-bold text-gray-800">{staff.name}</td>
                      <td className="px-5 py-3 text-sm text-slate-600">{staff.type === 'teacher' ? 'معلم' : 'إداري'}</td>
                      <td className="px-5 py-3">
                        <div className="flex items-center justify-end gap-4">
                          <label className="inline-flex items-center gap-1.5 text-xs font-black text-green-700 cursor-pointer">
                            <input
                              type="radio"
                              name={`staff-exclusion-${staff.id}`}
                              checked={!excluded}
                              onChange={() => setExclusionState(staff.id, staff.type, false)}
                              className="w-4 h-4 text-green-600 focus:ring-green-500"
                            />
                            متاح
                          </label>
                          <label className="inline-flex items-center gap-1.5 text-xs font-black text-rose-700 cursor-pointer">
                            <input
                              type="radio"
                              name={`staff-exclusion-${staff.id}`}
                              checked={excluded}
                              onChange={() => setExclusionState(staff.id, staff.type, true)}
                              className="w-4 h-4 text-rose-600 focus:ring-rose-500"
                            />
                            استثناء
                          </label>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {filteredStaff.length === 0 && (
              <div className="text-center py-10 text-slate-400 text-sm">لا يوجد موظفون مطابقون</div>
            )}
          </div>
        </div>
      )}

      {activeView === 'settings' && (
        <div className={CARD_CLASS}>
          <CardHeader
            icon={Settings}
            title="الإعدادات الأساسية"
            description="اضبط الإعدادات الأساسية للإشراف اليومي."
          />

          <div className="space-y-4">
            <SettingRow title="استثناء المعلمين من الإشراف عند وجود أكثر من 5 مساعدين إداريين">
              <PowerToggle
                checked={settings.autoExcludeTeachersWhen5Admins}
                onChange={() => setSettings(prev => ({ ...prev, autoExcludeTeachersWhen5Admins: !prev.autoExcludeTeachersWhen5Admins }))}
              />
            </SettingRow>

            <SettingRow
              title="للمدارس المشتركة اختر جدول موحد أو منفصل"
              hint={!hasSharedSchools ? 'يتطلب إضافة مدرسة مشتركة في قسم معلومات عامة' : undefined}
              disabled={!hasSharedSchools}
            >
              <div className={`flex gap-1.5 bg-slate-100 rounded-xl p-1 shrink-0 ${!hasSharedSchools ? 'pointer-events-none' : ''}`}>
                {[
                  { value: 'unified', label: 'موحد' },
                  { value: 'separate', label: 'منفصل' },
                ].map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => setSettings(prev => ({ ...prev, sharedSchoolMode: opt.value as any }))}
                    className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-all ${
                      settings.sharedSchoolMode === opt.value
                        ? 'bg-white text-[#655ac1] shadow-sm ring-1 ring-slate-200/50'
                        : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </SettingRow>
          </div>
        </div>
      )}

      {activeView === 'reminders' && (
        <div className={CARD_CLASS}>
          <CardHeader
            icon={Bell}
            title="الإشعارات"
            description="إعداد الإشعارات اليومية للمشرفين"
          />

          <div className="space-y-4">
            <SettingRow title="آلية إرسال الإشعارات اليومية بالإشراف اليومي">
              <div className="flex items-center gap-3">
                {[
                  { value: true, label: 'تلقائي' },
                  { value: false, label: 'يدوي' },
                ].map(opt => (
                  <label key={String(opt.value)} className="flex items-center gap-2 text-sm font-bold text-slate-700 cursor-pointer">
                <input
                      type="radio"
                      name="supervisionAutoSendReminder"
                      checked={settings.autoSendReminder === opt.value}
                      onChange={() => setSettings(prev => ({ ...prev, autoSendReminder: opt.value }))}
                      className="w-4 h-4 text-[#655ac1] focus:ring-[#655ac1]"
                    />
                    {opt.label}
                  </label>
                ))}
              </div>
            </SettingRow>

            <SettingRow title="وقت إرسال الإشعارات اليومية التلقائية" disabled={!settings.autoSendReminder}>
              <input
                type="time"
                value={settings.reminderSendTime || '07:00'}
                onChange={(e) => setSettings(prev => ({ ...prev, reminderSendTime: e.target.value }))}
                disabled={!settings.autoSendReminder}
                className="px-4 py-1.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#655ac1]/30 focus:border-[#655ac1] text-sm font-bold text-slate-700 disabled:bg-slate-100"
              />
            </SettingRow>

            <SettingRow title="طريقة الإرسال المفضلة للإشعارات اليومية التلقائية" disabled={!settings.autoSendReminder}>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 text-sm font-bold text-slate-700 cursor-pointer">
                  <input
                    type="radio"
                    name="supervisionReminderChannel"
                    checked={settings.reminderSendChannel === 'whatsapp'}
                    onChange={() => setSettings(prev => ({ ...prev, reminderSendChannel: 'whatsapp' }))}
                    disabled={!settings.autoSendReminder}
                    className="w-4 h-4 text-[#25D366] focus:ring-[#25D366]"
                  />
                  <WhatsAppIcon size={15} />
                  واتساب
                </label>
                <label className="flex items-center gap-2 text-sm font-bold text-slate-700 cursor-pointer">
                  <input
                    type="radio"
                    name="supervisionReminderChannel"
                    checked={settings.reminderSendChannel === 'sms'}
                    onChange={() => setSettings(prev => ({ ...prev, reminderSendChannel: 'sms' }))}
                    disabled={!settings.autoSendReminder}
                    className="w-4 h-4 text-[#007AFF] focus:ring-[#007AFF]"
                  />
                  <MessageSquare size={15} className="text-[#007AFF]" />
                  نصية
                </label>
              </div>
            </SettingRow>
          </div>
        </div>
      )}
    </div>
  );
};

export default SupervisionStaffPanel;
