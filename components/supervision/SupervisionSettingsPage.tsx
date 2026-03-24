import React, { useState } from 'react';
import { ArrowRight, Users, MapPin, Settings, Shield, Clock, Save, Bell, Send, ToggleLeft, ToggleRight, Check } from 'lucide-react';
import {
  Teacher, Admin, SchoolInfo,
  SupervisionStaffExclusion, SupervisionSettings,
  SupervisionLocation, SupervisionPeriodConfig,
} from '../../types';
import SupervisionStaffPanel from './SupervisionStaffPanel';
import SupervisionLocationsPanel from './SupervisionLocationsPanel';

interface Props {
  onBack: () => void;
  onSave: () => void;

  // — Supervisors settings props —
  teachers: Teacher[];
  admins: Admin[];
  totalStaffCount: number;
  exclusions: SupervisionStaffExclusion[];
  setExclusions: (excs: SupervisionStaffExclusion[] | ((prev: SupervisionStaffExclusion[]) => SupervisionStaffExclusion[])) => void;
  settings: SupervisionSettings;
  setSettings: (s: SupervisionSettings | ((prev: SupervisionSettings) => SupervisionSettings)) => void;
  availableCount: number;
  suggestExclude: boolean;

  // — Supervision settings props —
  locations: SupervisionLocation[];
  setLocations: (locs: SupervisionLocation[] | ((prev: SupervisionLocation[]) => SupervisionLocation[])) => void;
  periods: SupervisionPeriodConfig[];
  setPeriods: (p: SupervisionPeriodConfig[] | ((prev: SupervisionPeriodConfig[]) => SupervisionPeriodConfig[])) => void;
  schoolInfo: SchoolInfo;

  showToast: (msg: string, type: 'success' | 'warning' | 'error') => void;
}

type TabId = 'settings' | 'staff' | 'locations' | 'periods' | 'reminders';

const TABS: { id: TabId; title: string; icon: React.ElementType; subtitle: string }[] = [
  { id: 'settings',   title: 'قواعد الإشراف',       icon: Shield,   subtitle: 'ضبط قواعد توزيع الإشراف' },
  { id: 'staff',      title: 'الموظفون',            icon: Users,    subtitle: 'تحديد من يشارك في الإشراف' },
  { id: 'locations',  title: 'المواقع',             icon: MapPin,   subtitle: 'إدارة مواقع الإشراف في المدرسة' },
  { id: 'periods',    title: 'الفترات',             icon: Clock,    subtitle: 'تحديد الفترات والحصص المُشرَف عليها' },
  { id: 'reminders',  title: 'التذكيرات',           icon: Bell,     subtitle: 'إعداد رسائل التذكير اليومية للمشرفين' },
];

const SupervisionSettingsPage: React.FC<Props> = ({
  onBack, onSave,
  teachers, admins, totalStaffCount,
  exclusions, setExclusions, settings, setSettings,
  availableCount, suggestExclude,
  locations, setLocations, periods, setPeriods,
  schoolInfo, showToast,
}) => {
  const [activeTab, setActiveTab] = useState<TabId>('settings');
  const [hasSaved, setHasSaved] = useState(false);
  const [justSaved, setJustSaved] = useState(false);

  const activeTabInfo = TABS.find(t => t.id === activeTab)!;

  const handleSave = () => {
    onSave();
    setHasSaved(true);
    setJustSaved(true);
    showToast('تم حفظ إعدادات الإشراف', 'success');
    setTimeout(() => setJustSaved(false), 2000);
  };

  const handleBack = () => {
    if (!hasSaved) {
      if (!window.confirm('لم تقم بحفظ الإعدادات بعد. هل تريد الخروج بدون حفظ؟')) return;
    }
    onBack();
  };

  return (
    <div className="space-y-6 pb-6" dir="rtl">

      {/* ══════ Page Header ══════ */}
      <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-slate-100 relative overflow-hidden group hover:shadow-md transition-all duration-300">
        <div className="absolute top-0 right-0 w-28 h-28 bg-[#e5e1fe] rounded-bl-[3.5rem] -z-0 transition-transform group-hover:scale-110 duration-500" />
        <div className="relative z-10 flex items-center gap-3">
          <Settings size={36} strokeWidth={1.8} className="text-[#655ac1]" />
          <div>
            <h3 className="text-xl font-black text-slate-800">إعدادات الإشراف اليومي</h3>
            <p className="text-slate-500 font-medium text-sm mt-0.5 transition-all duration-300">
              {activeTabInfo.subtitle}
            </p>
          </div>
        </div>
      </div>

      {/* ══════ Tabs + Actions ══════ */}
      <div className="bg-white rounded-[2rem] px-4 py-3 shadow-sm border border-slate-100 space-y-3">
        <div className="flex gap-2 overflow-x-auto custom-scrollbar pb-1">
          {TABS.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-5 py-3 rounded-xl font-bold text-sm whitespace-nowrap transition-all duration-200 border ${
                  isActive
                    ? 'bg-[#655ac1] text-white shadow-md shadow-[#655ac1]/20 border-[#655ac1]'
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700 border-slate-200 bg-white'
                }`}
              >
                <Icon size={16} />
                {tab.title}
              </button>
            );
          })}
        </div>
        <div className="border-t border-slate-100 pt-3 flex items-center justify-end gap-2">
          <button
            onClick={handleBack}
            className="flex items-center gap-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 px-5 py-2 rounded-xl font-bold transition-all hover:border-[#655ac1] hover:text-[#655ac1] text-sm"
          >
            <ArrowRight size={16} className="text-[#655ac1]" />
            <span>رجوع</span>
          </button>
          <button
            onClick={handleSave}
            className={`flex items-center gap-2 px-5 py-2 rounded-xl font-bold text-sm transition-all shadow-md ${
              justSaved
                ? 'bg-green-500 hover:bg-green-600 text-white shadow-green-500/20'
                : 'bg-[#655ac1] hover:bg-[#5046a0] text-white shadow-[#655ac1]/20 hover:scale-105 active:scale-95'
            }`}
          >
            {justSaved ? <Check size={16} /> : <Save size={16} />}
            <span>{justSaved ? 'تم الحفظ' : 'حفظ الإعدادات'}</span>
          </button>
        </div>
      </div>

      {/* ══════ Tab Content ══════ */}
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-300" key={activeTab}>

        {activeTab === 'settings' && (
          <SupervisionStaffPanel
            teachers={teachers}
            admins={admins}
            exclusions={exclusions}
            setExclusions={setExclusions}
            settings={settings}
            setSettings={setSettings}
            availableCount={availableCount}
            suggestExclude={suggestExclude}
            hasSharedSchools={(schoolInfo.sharedSchools?.length ?? 0) > 0}
            showToast={showToast}
            activeView="settings"
          />
        )}

        {activeTab === 'staff' && (
          <SupervisionStaffPanel
            teachers={teachers}
            admins={admins}
            exclusions={exclusions}
            setExclusions={setExclusions}
            settings={settings}
            setSettings={setSettings}
            availableCount={availableCount}
            suggestExclude={suggestExclude}
            showToast={showToast}
            activeView="staff"
          />
        )}

        {activeTab === 'locations' && (
          <SupervisionLocationsPanel
            locations={locations}
            setLocations={setLocations}
            periods={periods}
            setPeriods={setPeriods}
            schoolInfo={schoolInfo}
            showToast={showToast}
            activeView="locations"
          />
        )}

        {activeTab === 'periods' && (
          <SupervisionLocationsPanel
            locations={locations}
            setLocations={setLocations}
            periods={periods}
            setPeriods={setPeriods}
            schoolInfo={schoolInfo}
            showToast={showToast}
            activeView="periods"
          />
        )}

        {activeTab === 'reminders' && (
          <div className="bg-white rounded-[2rem] p-6 sm:p-8 shadow-sm border border-slate-100 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-32 h-32 bg-gradient-to-br from-[#e5e1fe]/50 to-transparent rounded-br-full -z-0 pointer-events-none" />

            <div className="relative z-10 flex items-center gap-4 mb-6 pb-4 border-b border-slate-100">
              <div className="w-12 h-12 flex items-center justify-center bg-slate-100 text-[#655ac1] rounded-2xl shadow-sm">
                <Bell size={24} />
              </div>
              <div>
                <h3 className="text-xl font-black text-[#655ac1]">التذكيرات</h3>
                <p className="text-sm font-medium text-slate-500 mt-1">إعداد رسائل التذكير اليومية للمشرفين</p>
              </div>
            </div>

            <div className="relative z-10 space-y-4 animate-in fade-in duration-500">

              {/* 1. إرسال رسالة التذكير */}
              <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50/80 border border-slate-100 hover:border-slate-200 transition-colors">
                <div>
                  <p className="text-base font-bold text-slate-700">إرسال رسالة التذكير بالإشراف اليومي</p>
                  <p className="text-sm text-slate-500 mt-0.5">إرسال رسالة التذكير للمشرفين بطريقة تلقائية أو يدوية</p>
                </div>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 text-sm font-bold text-slate-700 cursor-pointer">
                    <input
                      type="radio"
                      name="supervisionAutoSendReminder"
                      checked={settings.autoSendReminder === true}
                      onChange={() => setSettings(prev => ({ ...prev, autoSendReminder: true }))}
                      className="w-4 h-4 text-[#655ac1] focus:ring-[#655ac1]"
                    />
                    تلقائي
                  </label>
                  <label className="flex items-center gap-2 text-sm font-bold text-slate-700 cursor-pointer border-r pr-3 border-slate-300">
                    <input
                      type="radio"
                      name="supervisionAutoSendReminder"
                      checked={!settings.autoSendReminder}
                      onChange={() => setSettings(prev => ({ ...prev, autoSendReminder: false }))}
                      className="w-4 h-4 text-[#655ac1] focus:ring-[#655ac1]"
                    />
                    يدوي
                  </label>
                </div>
              </div>

              {/* 2. وقت إرسال رسالة التذكير */}
              <div className={`flex items-center justify-between p-4 rounded-2xl bg-slate-50/80 border border-slate-100 transition-colors ${settings.autoSendReminder ? 'hover:border-slate-200' : 'opacity-50 pointer-events-none'}`}>
                <div>
                  <p className="text-base flex items-center gap-2 font-bold text-slate-700">
                    <Clock size={16} className="text-[#655ac1]" />
                    وقت إرسال رسالة التذكير
                  </p>
                  <p className="text-sm text-slate-500 mt-0.5">الوقت المفضل لإرسال رسائل التذكير تلقائياً</p>
                </div>
                <input
                  type="time"
                  value={settings.reminderSendTime || '07:00'}
                  onChange={(e) => setSettings(prev => ({ ...prev, reminderSendTime: e.target.value }))}
                  className="px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#655ac1]/30 focus:border-[#655ac1] font-bold text-slate-700"
                />
              </div>

              {/* 3. طريقة إرسال رسالة التذكير */}
              <div className={`flex items-center justify-between p-4 rounded-2xl bg-slate-50/80 border border-slate-100 transition-colors ${settings.autoSendReminder ? 'hover:border-slate-200' : 'opacity-50 pointer-events-none'}`}>
                <div>
                  <p className="text-base font-bold text-slate-700">طريقة إرسال رسالة التذكير</p>
                  <p className="text-sm text-slate-500 mt-0.5">اختر القناة المستخدمة عند الإرسال التلقائي</p>
                </div>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 text-sm font-bold text-slate-700 cursor-pointer">
                    <input
                      type="radio"
                      name="supervisionReminderChannel"
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
                      name="supervisionReminderChannel"
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

            </div>
          </div>
        )}

      </div>

    </div>
  );
};

export default SupervisionSettingsPage;
