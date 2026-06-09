import React, { useState, useEffect } from 'react';
import { MessageSquare, LayoutTemplate, Archive, BarChart3 } from 'lucide-react';
import MessageComposer from './messaging/MessageComposer';
import MessageArchive from './messaging/MessageArchive';
import MessageTemplates from './messaging/MessageTemplates';
import FintechDashboard from './messaging/FintechDashboard';
import { Teacher, Admin, Student, ClassInfo, Specialization, SchoolInfo, SubscriptionInfo, MessageComposerDraft } from '../types';

interface MessagesProps {
  subscription: SubscriptionInfo;
  setSubscription: React.Dispatch<React.SetStateAction<SubscriptionInfo>>;
  initialTab?: 'compose' | 'archive' | 'templates' | 'dashboard';
  initialDraft?: MessageComposerDraft | null;
  onNavigate?: (tab: string) => void;
}

const Messages: React.FC<MessagesProps> = ({ subscription, setSubscription, initialTab, initialDraft, onNavigate }) => {
  const [activeTab, setActiveTab] = useState<'compose' | 'archive' | 'templates' | 'dashboard'>(initialTab || 'compose');

  const [schoolInfo, setSchoolInfo] = useState<SchoolInfo | null>(null);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<ClassInfo[]>([]);
  const [specializations, setSpecializations] = useState<Specialization[]>([]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('school_assignment_v4');
      if (saved) {
        const data = JSON.parse(saved);
        if (data.schoolInfo) setSchoolInfo(data.schoolInfo);
        if (data.teachers) setTeachers(data.teachers);
        if (data.admins) setAdmins(data.admins);
        if (data.students) setStudents(data.students);
        if (data.classes) setClasses(data.classes);
        if (data.specializations) setSpecializations(data.specializations);
      }
    } catch (e) { console.error(e); }
  }, []);

  const tabs = [
    { id: 'compose',   label: 'إرسال رسالة',    hint: 'اختر المستلم ثم أرسل', icon: MessageSquare  },
    { id: 'templates', label: 'قوالب الرسائل',  hint: 'قوالب جاهزة ومرنة',    icon: LayoutTemplate },
    { id: 'archive',   label: 'أرشيف الرسائل',  hint: 'مرجع الرسائل المرسلة',  icon: Archive        },
    { id: 'dashboard', label: 'إحصائية الرسائل', hint: 'الرصيد والاستهلاك',     icon: BarChart3      },
  ] as const;

  return (
    <div className="space-y-6 dir-rtl animate-fade-in max-w-[1400px] mx-auto">

      {/* Header Card */}
      <div className="bg-white rounded-[2rem] p-8 shadow-lg shadow-slate-200/60 border border-slate-200 hover:shadow-xl hover:shadow-slate-200/70 transition-all duration-300">
        <div className="relative z-10">
          <h3 className="text-xl font-black text-slate-800 flex items-center gap-3">
            <MessageSquare size={36} strokeWidth={1.8} className="text-[#655ac1]" />
            الرسائل
          </h3>
          <p className="text-slate-500 font-medium mt-2 mr-12">
            عزز تواصلك المدرسي بإرسال الرسائل عبر الواتساب أو الرسائل النصية SMS
          </p>
        </div>
      </div>

      {/* Main Navigation — Stepper style (unified with sibling section pages) */}
      <div className="bg-white rounded-[2rem] p-5 shadow-sm border border-slate-200">
        <div className="flex items-stretch gap-3 overflow-x-auto custom-scrollbar">
          {tabs.map((tab, i) => {
            const isActive = activeTab === tab.id;
            return (
              <React.Fragment key={tab.id}>
                <button
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className="group min-w-[176px] flex-1 rounded-2xl px-1.5 text-right transition-all hover:bg-slate-50"
                >
                  <span className={`flex items-center gap-3 rounded-xl px-3 py-3 transition-all ${
                    isActive
                      ? 'bg-[#655ac1] text-white shadow-sm shadow-[#655ac1]/20'
                      : 'text-slate-700'
                  }`}>
                    <span className="shrink-0">
                      <span className={`w-9 h-9 rounded-xl flex items-center justify-center border transition-all ${
                        isActive ? 'bg-white border-white' : 'bg-transparent border-slate-200 group-hover:border-[#655ac1]/30'
                      }`}>
                        <tab.icon size={17} className="text-[#655ac1]" />
                      </span>
                    </span>
                    <span className="min-w-0">
                      <span className={`block font-black text-sm leading-tight ${
                        isActive ? 'text-white' : 'text-slate-800'
                      }`}>
                        {tab.label}
                      </span>
                      <span className={`block text-[11px] font-bold mt-0.5 truncate ${
                        isActive ? 'text-white/80' : 'text-slate-400'
                      }`}>
                        {tab.hint}
                      </span>
                    </span>
                  </span>
                </button>
                {i < tabs.length - 1 && (
                  <div className="flex items-center shrink-0" aria-hidden="true">
                    <span className="h-9 w-px rounded-full bg-gradient-to-b from-transparent via-slate-200 to-transparent" />
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Tab Content */}
      <div className="mt-6">
        {activeTab === 'compose' && (
          <MessageComposer
            schoolInfo={schoolInfo ?? { entityType: 'school', schoolName: '', region: '', phases: [] } as unknown as SchoolInfo}
            teachers={teachers}
            admins={admins}
            students={students}
            classes={classes}
            specializations={specializations}
            subscription={subscription}
            setSubscription={setSubscription}
            initialDraft={initialDraft}
          />
        )}
        {activeTab === 'archive' && (
          <MessageArchive schoolName={schoolInfo?.schoolName || 'اسم المدرسة'} calendarType={schoolInfo?.calendarType} />
        )}
        {activeTab === 'templates' && (
          <MessageTemplates />
        )}
        {activeTab === 'dashboard' && (
          <FintechDashboard
            subscription={subscription}
            schoolInfo={schoolInfo}
            onNavigate={onNavigate}
          />
        )}
      </div>

    </div>
  );
};

export default Messages;
