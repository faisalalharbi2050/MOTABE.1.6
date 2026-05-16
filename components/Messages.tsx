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
    { id: 'compose',   label: 'إرسال رسالة',    icon: MessageSquare },
    { id: 'templates', label: 'قوالب الرسائل',  icon: LayoutTemplate },
    { id: 'archive',   label: 'أرشيف الرسائل',  icon: Archive        },
    { id: 'dashboard', label: 'إحصائية الرسائل', icon: BarChart3      },
  ] as const;

  return (
    <div className="space-y-6 dir-rtl animate-fade-in max-w-[1400px] mx-auto">

      {/* Header Card */}
      <div className="bg-white rounded-[2rem] p-8 shadow-sm border border-slate-100 relative group hover:shadow-md transition-all duration-300 overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-[#e5e1fe] rounded-bl-[4rem] -z-0 transition-transform group-hover:scale-110 duration-500" />
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

      {/* Main Tabs */}
      <div className="bg-white p-2 rounded-2xl shadow-sm border border-slate-200 flex gap-2 overflow-x-auto custom-scrollbar">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold whitespace-nowrap transition-all flex-1 justify-center ${
              activeTab === tab.id
                ? 'bg-[#655ac1] text-white shadow-md shadow-indigo-200'
                : 'text-slate-500 hover:bg-slate-50'
            }`}
          >
            <tab.icon size={18} />
            {tab.label}
          </button>
        ))}
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
          <MessageArchive schoolName={schoolInfo?.schoolName || 'اسم المدرسة'} />
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
