import React, { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  ClipboardList,
  Clock,
  Lock,
  ShieldCheck,
  UserPlus,
  Users,
} from 'lucide-react';
import { Admin, Delegate, Teacher } from '../../types';
import AddDelegate from './AddDelegate';
import ManageDelegates from './ManageDelegates';
import ActionLogs from './ActionLogs';
import DelegateLoginPortal from './DelegateLoginPortal';
import Toast, { useToast } from './Toast';
import { getLogs } from './auditLog';

interface RolePermissionsProps {
  teachers: Teacher[];
  admins: Admin[];
  onNavigate?: (tab: 'settings_teachers' | 'settings_admins') => void;
}

const DELEGATES_STORAGE_KEY = 'motabe_delegates';

const readDelegates = (): Delegate[] => {
  try {
    return JSON.parse(localStorage.getItem(DELEGATES_STORAGE_KEY) ?? '[]');
  } catch {
    return [];
  }
};

const StatCard = ({
  label,
  value,
  hint,
  icon: Icon,
  tone = 'primary',
}: {
  label: string;
  value: React.ReactNode;
  hint: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  tone?: 'primary' | 'green' | 'amber' | 'slate';
}) => {
  const tones = {
    primary: 'bg-[#655ac1]/8 text-[#655ac1] border-[#655ac1]/15',
    green: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    amber: 'bg-amber-50 text-amber-700 border-amber-100',
    slate: 'bg-slate-50 text-slate-600 border-slate-200',
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold text-slate-400">{label}</p>
          <p className="mt-2 text-2xl font-black text-slate-800">{value}</p>
          <p className="mt-1 text-xs font-medium text-slate-400">{hint}</p>
        </div>
        <div className={`flex h-10 w-10 items-center justify-center rounded-xl border ${tones[tone]}`}>
          <Icon size={18} />
        </div>
      </div>
    </div>
  );
};

const RolePermissions: React.FC<RolePermissionsProps> = ({ teachers, admins, onNavigate }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'add' | 'manage' | 'logs'>('overview');
  const [showLoginPortal, setShowLoginPortal] = useState(false);
  const [delegates, setDelegates] = useState<Delegate[]>([]);
  const { toast, showToast } = useToast();

  const refreshDelegates = () => setDelegates(readDelegates());

  useEffect(() => {
    refreshDelegates();
    const handleStorage = () => refreshDelegates();
    window.addEventListener('storage', handleStorage);
    window.addEventListener('motabe:delegates-updated', handleStorage);
    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('motabe:delegates-updated', handleStorage);
    };
  }, []);

  const summary = useMemo(() => {
    const pending = delegates.filter((delegate) => delegate.isPendingSetup).length;
    const active = delegates.filter((delegate) => delegate.isActive && !delegate.isPendingSetup).length;
    const inactive = delegates.filter((delegate) => !delegate.isActive).length;
    const lastLog = getLogs()[0];

    return { pending, active, inactive, lastLog };
  }, [delegates]);

  const tabs = [
    { id: 'overview', label: 'لوحة الصلاحيات', icon: ShieldCheck },
    { id: 'add', label: 'إضافة مفوض', icon: UserPlus },
    { id: 'manage', label: 'إدارة المفوضين', icon: Users },
    { id: 'logs', label: 'سجل الإجراءات', icon: ClipboardList },
  ] as const;

  return (
    <div className="mx-auto max-w-[1400px] space-y-6 pb-20 dir-rtl animate-fade-in">
      <div className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-lg shadow-slate-200/60 transition-all duration-300 hover:shadow-xl hover:shadow-slate-200/70">
        <div className="relative z-10 flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h3 className="flex items-center gap-3 text-xl font-black text-slate-800">
              <Lock size={36} strokeWidth={1.8} className="text-[#655ac1]" />
              الصلاحيات
            </h3>
            <p className="mr-12 mt-2 max-w-3xl text-sm font-medium leading-relaxed text-slate-500">
              إدارة وصول المعلمين والإداريين إلى أقسام المنصة، مع تفويض دقيق وتتبع واضح لكل إجراء.
            </p>
          </div>

          <div className="rounded-2xl border border-[#655ac1]/15 bg-[#655ac1]/6 px-4 py-3 text-sm">
            <p className="font-black text-[#655ac1]">مدير النظام فقط</p>
            <p className="mt-1 text-xs font-medium text-slate-500">
              التفويض محصور على المعلمين والإداريين المسجلين.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
        <StatCard label="إجمالي المفوضين" value={delegates.length} hint="جميع الحسابات المفوضة" icon={Users} />
        <StatCard label="النشطون" value={summary.active} hint="جاهزون للدخول" icon={ShieldCheck} tone="green" />
        <StatCard label="بانتظار التفعيل" value={summary.pending} hint="رمز تفعيل لم يكتمل" icon={Clock} tone="amber" />
        <StatCard label="الموقوفون" value={summary.inactive} hint="تم تعطيل دخولهم" icon={Lock} tone="slate" />
        <StatCard
          label="آخر إجراء"
          value={summary.lastLog ? 'مسجل' : 'لا يوجد'}
          hint={summary.lastLog?.targetDelegateName || 'سيظهر بعد أول عملية'}
          icon={Activity}
          tone="primary"
        />
      </div>

      <div className="flex gap-2 overflow-x-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-sm custom-scrollbar">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-xl px-5 py-3 text-sm font-bold transition-all ${
              activeTab === tab.id
                ? 'bg-[#655ac1] text-white shadow-md shadow-indigo-200'
                : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
            }`}
          >
            <tab.icon size={17} />
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="flex items-center gap-2 text-lg font-black text-slate-800">
                  <ShieldCheck size={20} className="text-[#655ac1]" />
                  مسار التفويض
                </h3>
                <p className="mt-1 text-sm font-medium text-slate-400">
                  التجربة مصممة لتقليل الخطأ قبل إصدار رمز التفعيل.
                </p>
              </div>
              <button
                onClick={() => setActiveTab('add')}
                className="rounded-xl bg-[#655ac1] px-4 py-2.5 text-sm font-bold text-white shadow-md shadow-indigo-200 transition-all hover:-translate-y-0.5"
              >
                إضافة مفوض
              </button>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-3">
              {[
                ['1', 'اختيار الفئة', 'معلم أو إداري فقط'],
                ['2', 'تحديد الصلاحيات', 'كاملة أو مخصصة لكل قسم'],
                ['3', 'إصدار التفعيل', 'رمز مؤقت ثم إنشاء الحساب'],
              ].map(([step, title, body]) => (
                <div key={step} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white text-sm font-black text-[#655ac1] shadow-sm">
                    {step}
                  </span>
                  <p className="mt-3 font-black text-slate-800">{title}</p>
                  <p className="mt-1 text-xs font-medium text-slate-400">{body}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-lg font-black text-slate-800">جاهزية البيانات</h3>
            <p className="mt-1 text-sm font-medium text-slate-400">
              لا يمكن التفويض إلا لمن هو مسجل ضمن المعلمين أو الإداريين.
            </p>

            <div className="mt-5 space-y-3">
              <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <span className="font-bold text-slate-700">المعلمون</span>
                <span className="rounded-full bg-white px-3 py-1 text-sm font-black text-[#655ac1]">{teachers.length}</span>
              </div>
              <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <span className="font-bold text-slate-700">الإداريون</span>
                <span className="rounded-full bg-white px-3 py-1 text-sm font-black text-[#655ac1]">{admins.length}</span>
              </div>
            </div>

            {(teachers.length === 0 || admins.length === 0) && onNavigate && (
              <div className="mt-5 flex flex-wrap gap-2">
                {teachers.length === 0 && (
                  <button
                    onClick={() => onNavigate('settings_teachers')}
                    className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-600 transition-all hover:border-[#655ac1] hover:text-[#655ac1]"
                  >
                    إضافة معلمين
                  </button>
                )}
                {admins.length === 0 && (
                  <button
                    onClick={() => onNavigate('settings_admins')}
                    className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-600 transition-all hover:border-[#655ac1] hover:text-[#655ac1]"
                  >
                    إضافة إداريين
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'add' && (
        <AddDelegate
          teachers={teachers}
          admins={admins}
          onNavigate={onNavigate}
          onDelegateCreated={refreshDelegates}
          onSimulateLogin={() => setShowLoginPortal(true)}
        />
      )}

      {activeTab === 'manage' && <ManageDelegates onDelegatesChange={refreshDelegates} />}
      {activeTab === 'logs' && <ActionLogs />}

      {showLoginPortal && (
        <DelegateLoginPortal
          onSuccess={(delegate) => {
            showToast(`تم إعداد حساب المفوض ${delegate.name} بنجاح!`, 'success');
            setShowLoginPortal(false);
            refreshDelegates();
          }}
          onCancel={() => setShowLoginPortal(false)}
        />
      )}

      <Toast toast={toast} />
    </div>
  );
};

export default RolePermissions;
