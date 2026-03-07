import React, { useState, useEffect } from 'react';
import { Activity, Clock, Shield, AlertCircle, CalendarDays, Filter } from 'lucide-react';
import { ActionLog, Delegate } from '../../types';

// Mock logs since we don't have a backend
const MOCK_LOGS: ActionLog[] = [
  {
    id: '1',
    delegateId: 'd1',
    delegateName: 'أحمد محمد',
    action: 'إرسال رسالة تذكير بالانتظار',
    module: 'daily_waiting',
    timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
  },
  {
    id: '2',
    delegateId: 'd1',
    delegateName: 'أحمد محمد',
    action: 'تعديل إعدادات الجدول المدرسي',
    module: 'schedule',
    timestamp: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
    details: 'تم تعديل الحد الأقصى للحصص'
  },
  {
    id: '3',
    delegateId: 'd2',
    delegateName: 'خالد عبدالله',
    action: 'تعديل إعدادات الدعم الفني',
    module: 'support',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
  }
];

export default function ActionLogs() {
  const [logs, setLogs] = useState<ActionLog[]>(MOCK_LOGS);
  const [selectedDelegate, setSelectedDelegate] = useState<string>('all');
  
  const formatDateDay = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('ar-SA', { weekday: 'long' }).format(date);
  };

  const formatDateOnly = (dateString: string) => {
    const date = new Date(dateString);
    // Formatting date as dd/mm/yyyy
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const formatTimeOnly = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('ar-SA', {
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  const uniqueDelegates = Array.from(new Set(logs.map(log => log.delegateName))).map(name => {
    return { name, id: logs.find(l => l.delegateName === name)?.delegateId as string };
  });

  const filteredLogs = selectedDelegate === 'all' 
    ? logs 
    : logs.filter(log => log.delegateId === selectedDelegate);

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-50/50">
          <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <Activity className="text-[#655ac1]" size={20} />
            سجل الإجراءات والعمليات
          </h3>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Filter className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <select
                value={selectedDelegate}
                onChange={(e) => setSelectedDelegate(e.target.value)}
                className="pl-4 pr-10 py-2 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-700 outline-none focus:border-[#655ac1] focus:ring-1 focus:ring-[#655ac1] transition-all appearance-none cursor-pointer hover:border-[#655ac1]/50 shadow-sm"
              >
                <option value="all">جميع المفوضين</option>
                {uniqueDelegates.map(delegate => (
                  <option key={delegate.id} value={delegate.id}>{delegate.name}</option>
                ))}
              </select>
            </div>
            <div className="text-sm text-slate-500 font-medium px-4 py-2 bg-white border border-slate-200 rounded-xl shadow-sm">
              آخر 30 يوماً
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="px-6 py-4 text-sm font-bold text-slate-600">المفوض</th>
                <th className="px-6 py-4 text-sm font-bold text-slate-600">القسم</th>
                <th className="px-6 py-4 text-sm font-bold text-slate-600">العملية</th>
                <th className="px-6 py-4 text-sm font-bold text-slate-600">اليوم</th>
                <th className="px-6 py-4 text-sm font-bold text-slate-600">التاريخ</th>
                <th className="px-6 py-4 text-sm font-bold text-slate-600">الوقت</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredLogs.map(log => (
                <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-indigo-50 text-indigo-500 flex items-center justify-center border border-indigo-100">
                        <Shield size={14} />
                      </div>
                      <span className="font-bold text-slate-700">{log.delegateName}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-slate-600 text-sm font-medium">
                    {getModuleName(log.module)}
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-slate-800 font-medium">{log.action}</span>
                    {log.details && (
                      <p className="text-xs text-slate-500 mt-1">{log.details}</p>
                    )}
                  </td>
                  <td className="px-6 py-4 text-slate-800 text-sm font-bold whitespace-nowrap">
                    {formatDateDay(log.timestamp)}
                  </td>
                  <td className="px-6 py-4 text-slate-600 text-sm font-medium whitespace-nowrap flex items-center gap-1.5 min-h-[50px]">
                    <CalendarDays size={14} className="text-[#655ac1]" />
                    <span dir="ltr">{formatDateOnly(log.timestamp)}</span>
                  </td>
                  <td className="px-6 py-4 text-slate-500 text-sm whitespace-nowrap">
                    <div className="flex items-center gap-1.5">
                      <Clock size={14} className="text-rose-500" />
                      <span dir="ltr" className="font-bold">{formatTimeOnly(log.timestamp)}</span>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredLogs.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                    <AlertCircle size={48} className="mx-auto mb-4 opacity-30 text-slate-400" />
                    <p className="text-lg font-medium">{logs.length > 0 ? "لا توجد عمليات مسجلة لهذا المفوض" : "لا توجد عمليات مسجلة حتى الآن"}</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function getModuleName(moduleId: string) {
  const map: Record<string, string> = {
    'settings': 'الإعدادات العامة',
    'schedule': 'الجدول المدرسي',
    'daily_waiting': 'الانتظار اليومي',
    'messages': 'الرسائل',
    'subscriptions': 'الاشتراك',
    'support': 'الدعم الفني',
    'permissions': 'الصلاحيات'
  };
  return map[moduleId] || moduleId;
}
