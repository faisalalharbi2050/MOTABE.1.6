import React, { useMemo, useState } from 'react';
import { Bell, MessageSquare, RefreshCw, Search, Settings, Users } from 'lucide-react';
import {
  Teacher, Admin, SchoolInfo, SupervisionStaffExclusion, SupervisionSettings
} from '../../types';
import { Switch, SegmentedToggle } from './controls';

const WhatsAppIcon = ({ size = 16 }: { size?: number }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="#25D366">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
  </svg>
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

const SettingRow: React.FC<{ title: string; hint?: string; children: React.ReactNode; disabled?: boolean }> = ({
  title, hint, children, disabled
}) => (
  <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-3 border-b border-slate-100 last:border-b-0 transition-colors ${disabled ? 'opacity-50' : ''}`}>
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
  schoolInfo?: SchoolInfo;
  showToast: (msg: string, type: 'success' | 'warning' | 'error') => void;
}

const SupervisionStaffPanel: React.FC<Props> = ({
  teachers, admins, exclusions, setExclusions, settings, setSettings,
  hasSharedSchools, activeView, schoolInfo
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'teachers' | 'admins'>('all');

  const allStaff = useMemo(() => ([
    ...teachers.map(t => ({ id: t.id, name: t.name, type: 'teacher' as const, title: 'معلم' })),
    ...admins.map(a => ({ id: a.id, name: a.name, type: 'admin' as const, title: ((a as any).role || '').trim() || 'إداري' })),
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

  const currentSemesterName = schoolInfo?.semesters?.find(sem => sem.id === schoolInfo.currentSemesterId || sem.isCurrent)?.name || '';
  const todayDayName = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'][new Date().getDay()];
  const todayHijriDate = new Intl.DateTimeFormat('ar-SA-u-ca-islamic-umalqura', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date());
  const defaultReminderTemplate = `المكرم/ (اسم المستلم)
نذكركم بموعد الإشراف اليومي لهذا اليوم ${todayDayName} ، شاكرين تعاونكم.
${schoolInfo?.schoolName || 'اسم المدرسة'} - ${todayDayName} - ${todayHijriDate} - ${currentSemesterName || 'الفصل الدراسي'}`;
  const reminderTemplateValue = (settings.reminderMessageTemplate || defaultReminderTemplate)
    .replace(/\(\s*(?:اسم المعلم|يظهر هنا اسم المعلم)\s*\)/g, '(اسم المستلم)')
    .replace(/\(\s*(?:اليوم|يظهر هنا اليوم)\s*\)/g, todayDayName)
    .replace(/\(\s*(?:اسم المدرسة|يظهر اسم المدرسة)\s*\)/g, schoolInfo?.schoolName || 'اسم المدرسة')
    .replace(/\(\s*(?:التاريخ بالهجري|يظهر التاريخ بالهجري)\s*\)/g, todayHijriDate)
    .replace(/\(\s*(?:الفصل الدراسي|يظهر الفصل الدراسي)\s*\)/g, currentSemesterName || 'الفصل الدراسي');

  const setExclusionState = (staffId: string, staffType: 'teacher' | 'admin', excluded: boolean) => {
    setExclusions(prev => {
      const existing = prev.find(e => e.staffId === staffId);
      if (existing) return prev.map(e => e.staffId === staffId ? { ...e, isExcluded: excluded } : e);
      return [...prev, { staffId, staffType, isExcluded: excluded }];
    });
  };

  const excludedCount = allStaff.filter(s => isExcluded(s.id)).length;
  const availableManualCount = allStaff.length - excludedCount;

  return (
    <div className="space-y-6">
      {activeView === 'staff' && (
        <div className={CARD_CLASS}>
          <CardHeader
            icon={Users}
            title="المشرفون"
            description="البحث واستثناء الموظفين من الإشراف اليومي"
            action={
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-bold text-slate-500">
                  المتاحون <span className="font-black text-[#655ac1]">{availableManualCount}</span>
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-bold text-slate-500">
                  المستثنون <span className="font-black text-[#655ac1]">{excludedCount}</span>
                </span>
              </div>
            }
          />

          <div className="flex flex-col lg:flex-row gap-3 mb-4">
            <div className="w-full lg:w-80 relative">
              <Search size={16} className="absolute right-3 top-3 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="ابحث"
                className="w-full pr-10 pl-3 py-2.5 rounded-xl border border-slate-200 text-sm font-medium focus:ring-2 focus:ring-slate-200 focus:border-slate-300 outline-none transition-all placeholder:text-slate-400 bg-white"
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
                    filterType === tab.id ? 'bg-white text-slate-900 shadow-sm border-slate-200' : 'text-slate-400 hover:text-slate-600 border-transparent'
                  }`}
                >
                  {tab.label} <span className={`font-black ${filterType === tab.id ? 'text-[#655ac1]' : ''}`}>({tab.count})</span>
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-100">
            <table className="w-full table-fixed text-right">
              <thead className="bg-white border-b border-slate-200 text-xs text-[#655ac1]">
                <tr>
                  <th className="px-4 py-3.5 font-black w-16 text-center">م</th>
                  <th className="px-4 py-3.5 font-black w-[36%]">اسم الموظف</th>
                  <th className="px-4 py-3.5 font-black w-[34%]">الصفة</th>
                  <th className="px-4 py-3.5 font-black text-center">الحالة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredStaff.map((staff, index) => {
                  const excluded = isExcluded(staff.id);
                  return (
                    <tr key={staff.id} className="hover:bg-[#e5e1fe]/10 transition-colors">
                      <td className="px-4 py-2.5 text-center">
                        <span className="text-xs font-bold text-slate-400 bg-slate-50 w-6 h-6 inline-flex items-center justify-center rounded-full">{index + 1}</span>
                      </td>
                      <td className="px-4 py-2.5 text-[13px] font-bold text-slate-700 truncate">{staff.name}</td>
                      <td className="px-4 py-2.5 text-[13px] font-bold text-slate-700 truncate">{staff.title}</td>
                      <td className="px-4 py-2.5 text-center">
                        <SegmentedToggle<boolean>
                          value={excluded}
                          onChange={(v) => setExclusionState(staff.id, staff.type, v)}
                          options={[
                            { value: false, label: 'متاح', activeClass: 'bg-green-500 text-white shadow-sm' },
                            { value: true, label: 'استثناء', activeClass: 'bg-rose-500 text-white shadow-sm' },
                          ]}
                        />
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
              <Switch
                checked={settings.autoExcludeTeachersWhen5Admins}
                onChange={() => setSettings(prev => ({ ...prev, autoExcludeTeachersWhen5Admins: !prev.autoExcludeTeachersWhen5Admins }))}
              />
            </SettingRow>

            <SettingRow
              title="للمدارس المشتركة اختر جدول موحد أو منفصل"
              hint={!hasSharedSchools ? 'يتطلب إضافة مدرسة مشتركة في قسم بيانات المدرسة' : undefined}
              disabled={!hasSharedSchools}
            >
              <div className={!hasSharedSchools ? 'pointer-events-none' : ''}>
                <SegmentedToggle<string>
                  value={settings.sharedSchoolMode || 'unified'}
                  onChange={(v) => setSettings(prev => ({ ...prev, sharedSchoolMode: v as any }))}
                  options={[
                    { value: 'unified', label: 'موحّد', activeClass: 'bg-[#655ac1] text-white shadow-sm' },
                    { value: 'separate', label: 'منفصل', activeClass: 'bg-[#655ac1] text-white shadow-sm' },
                  ]}
                />
              </div>
            </SettingRow>
          </div>
        </div>
      )}

      {activeView === 'reminders' && (
        <div className={CARD_CLASS}>
          <CardHeader
            icon={Bell}
            title="الإشعارات التلقائية"
            description="إعداد الإشعارات اليومية للمشرفين"
            action={
              <SegmentedToggle<boolean>
                value={!!settings.autoSendReminder}
                onChange={(v) => setSettings(prev => ({ ...prev, autoSendReminder: v }))}
                options={[
                  { value: true, label: 'تلقائي', activeClass: 'bg-[#655ac1] text-white shadow-sm' },
                  { value: false, label: 'يدوي', activeClass: 'bg-[#655ac1] text-white shadow-sm' },
                ]}
              />
            }
          />

          {settings.autoSendReminder ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">وقت الإرسال التلقائي</label>
                  <input
                    type="time"
                    value={settings.reminderSendTime || '07:00'}
                    onChange={(e) => setSettings(prev => ({ ...prev, reminderSendTime: e.target.value }))}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl bg-white text-sm font-bold text-slate-700 outline-none focus:border-[#655ac1]/40 focus:ring-2 focus:ring-[#655ac1]/10 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">طريقة الإرسال المفضّلة</label>
                  <SegmentedToggle<string>
                    fluid
                    value={settings.reminderSendChannel || 'whatsapp'}
                    onChange={(v) => setSettings(prev => ({ ...prev, reminderSendChannel: v as any }))}
                    options={[
                      { value: 'whatsapp', label: (<><WhatsAppIcon size={15} /> واتساب</>), activeClass: 'bg-white text-[#1c8a4e] shadow-sm ring-1 ring-green-200' },
                      { value: 'sms', label: (<><MessageSquare size={15} className="text-[#007AFF]" /> نصية</>), activeClass: 'bg-white text-[#007AFF] shadow-sm ring-1 ring-blue-200' },
                    ]}
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-bold text-slate-700">رسالة التذكير</label>
                  <button
                    type="button"
                    title="استعادة النص الافتراضي"
                    aria-label="استعادة النص الافتراضي"
                    onClick={() => setSettings(prev => ({ ...prev, reminderMessageTemplate: defaultReminderTemplate }))}
                    className="inline-flex items-center gap-1.5 h-8 px-3 rounded-xl border border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50 text-xs font-bold text-slate-600 transition-all"
                  >
                    <RefreshCw size={13} className="text-[#655ac1]" />
                    استعادة الافتراضي
                  </button>
                </div>
                <textarea
                  value={reminderTemplateValue}
                  onChange={e => setSettings(prev => ({ ...prev, reminderMessageTemplate: e.target.value }))}
                  rows={5}
                  className="w-full bg-white border border-slate-200 rounded-xl p-4 outline-none focus:border-[#655ac1]/40 focus:ring-2 focus:ring-[#655ac1]/10 resize-none text-sm leading-relaxed transition-all"
                  dir="rtl"
                />
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-200 px-6 py-10 text-center">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-3">
                <Bell size={22} className="text-slate-400" />
              </div>
              <p className="text-sm font-bold text-slate-600">الإرسال يدوي</p>
              <p className="text-xs font-medium text-slate-400 mt-1 leading-relaxed">
                لن تُرسل إشعارات تلقائية. فعّل وضع «تلقائي» لضبط وقت الإرسال والقناة ونص رسالة التذكير.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SupervisionStaffPanel;
