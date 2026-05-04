import React, { useMemo, useState } from 'react';
import { BarChart3, ClipboardCheck, Eye, Printer, Search, UserCheck } from 'lucide-react';
import { DutyScheduleData, SchoolInfo } from '../../../types';
import { DAY_NAMES } from '../../../utils/dutyUtils';

interface Props {
  dutyData: DutyScheduleData;
  schoolInfo: SchoolInfo;
  onOpenLegacyMonitoring: () => void;
}

type InnerTab = 'daily' | 'reports';

const MonitoringTab: React.FC<Props> = ({ dutyData, schoolInfo, onOpenLegacyMonitoring }) => {
  const [activeView, setActiveView] = useState<InnerTab>('daily');
  const [searchTerm, setSearchTerm] = useState('');

  const rows = useMemo(() => {
    return dutyData.dayAssignments.flatMap(day =>
      day.staffAssignments.map(staff => ({
        day: day.day,
        date: day.date || '',
        staffId: staff.staffId,
        staffName: staff.staffName,
        staffType: staff.staffType,
        report: dutyData.reports?.find(report => report.day === day.day && report.staffId === staff.staffId && report.isSubmitted),
      }))
    ).filter(row => row.staffName.toLowerCase().includes(searchTerm.trim().toLowerCase()));
  }, [dutyData.dayAssignments, dutyData.reports, searchTerm]);

  const reportStats = useMemo(() => {
    const map = new Map<string, { staffName: string; staffType: string; total: number; submitted: number }>();
    rows.forEach(row => {
      const current = map.get(row.staffId) || {
        staffName: row.staffName,
        staffType: row.staffType === 'teacher' ? 'معلم' : 'إداري',
        total: 0,
        submitted: 0,
      };
      current.total += 1;
      if (row.report) current.submitted += 1;
      map.set(row.staffId, current);
    });
    return Array.from(map.entries()).map(([staffId, value]) => ({ staffId, ...value }));
  }, [rows]);

  return (
    <div className="space-y-5" dir="rtl">
      <div className="flex flex-wrap items-center gap-2">
        {[
          { id: 'daily' as InnerTab, label: 'المتابعة اليومية للمناوبة', icon: UserCheck },
          { id: 'reports' as InnerTab, label: 'تقارير الأداء', icon: BarChart3 },
        ].map(tab => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveView(tab.id)}
            className={`inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl border text-sm font-black whitespace-nowrap transition-all ${
              activeView === tab.id
                ? 'bg-[#655ac1] text-white border-[#655ac1] shadow-md shadow-[#655ac1]/20'
                : 'bg-white text-slate-600 border-slate-200 hover:border-[#655ac1] hover:text-[#655ac1] hover:bg-slate-50'
            }`}
          >
            <tab.icon size={17} />
            {tab.label}
          </button>
        ))}
      </div>

      {activeView === 'daily' && (
        <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-black text-slate-800">جدول المتابعة اليومية للمناوبة</h3>
              <p className="text-xs font-bold text-slate-400 mt-1">{schoolInfo.schoolName || ''}</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  value={searchTerm}
                  onChange={event => setSearchTerm(event.target.value)}
                  placeholder="ابحث عن مناوب"
                  className="w-64 max-w-[55vw] pr-10 pl-3 py-2.5 rounded-xl border-2 border-slate-200 text-sm font-bold focus:border-[#655ac1] outline-none"
                />
              </div>
              <button
                type="button"
                onClick={onOpenLegacyMonitoring}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#655ac1] text-white text-xs font-black hover:bg-[#5046a0] transition-all"
              >
                <Eye size={15} />
                فتح المتابعة
              </button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-right">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-5 py-4 text-xs font-black text-[#655ac1] text-center w-14">م</th>
                  <th className="px-5 py-4 text-xs font-black text-[#655ac1]">اليوم</th>
                  <th className="px-5 py-4 text-xs font-black text-[#655ac1]">التاريخ</th>
                  <th className="px-5 py-4 text-xs font-black text-[#655ac1]">المناوب</th>
                  <th className="px-5 py-4 text-xs font-black text-[#655ac1] text-center">حالة التقرير</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((row, index) => (
                  <tr key={`${row.day}-${row.date}-${row.staffId}`} className="hover:bg-[#fbfaff] transition-colors">
                    <td className="px-5 py-4 text-center text-sm font-black text-slate-400">{index + 1}</td>
                    <td className="px-5 py-4 text-sm font-bold text-slate-800">{DAY_NAMES[row.day] || row.day}</td>
                    <td className="px-5 py-4 text-sm font-bold text-slate-500">{row.date || '-'}</td>
                    <td className="px-5 py-4 text-sm font-bold text-slate-800">{row.staffName}</td>
                    <td className="px-5 py-4 text-center">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black border ${
                        row.report ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-slate-50 text-slate-400 border-slate-200'
                      }`}>
                        <ClipboardCheck size={13} />
                        {row.report ? 'تم التسليم' : 'لم يسلّم'}
                      </span>
                    </td>
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-sm font-bold text-slate-400">لا توجد تكليفات مناوبة مطابقة.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeView === 'reports' && (
        <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-black text-slate-800">تقارير أداء المناوبة</h3>
              <p className="text-xs font-bold text-slate-400 mt-1">ملخص تسليم تقارير المناوبة حسب المناوب.</p>
            </div>
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#655ac1] text-white text-xs font-black hover:bg-[#5046a0] transition-all"
            >
              <Printer size={15} />
              طباعة التقرير
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-right">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-5 py-4 text-xs font-black text-[#655ac1] text-center w-14">م</th>
                  <th className="px-5 py-4 text-xs font-black text-[#655ac1]">المناوب</th>
                  <th className="px-5 py-4 text-xs font-black text-[#655ac1] text-center">الصفة</th>
                  <th className="px-5 py-4 text-xs font-black text-[#655ac1] text-center">عدد المناوبات</th>
                  <th className="px-5 py-4 text-xs font-black text-[#655ac1] text-center">التقارير المسلمة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {reportStats.map((row, index) => (
                  <tr key={row.staffId}>
                    <td className="px-5 py-4 text-center text-sm font-black text-slate-400">{index + 1}</td>
                    <td className="px-5 py-4 text-sm font-black text-slate-800">{row.staffName}</td>
                    <td className="px-5 py-4 text-sm font-bold text-slate-500 text-center">{row.staffType}</td>
                    <td className="px-5 py-4 text-sm font-black text-slate-700 text-center">{row.total}</td>
                    <td className="px-5 py-4 text-sm font-black text-[#655ac1] text-center">{row.submitted}</td>
                  </tr>
                ))}
                {reportStats.length === 0 && (
                  <tr><td colSpan={5} className="px-6 py-12 text-center text-sm font-bold text-slate-400">لا توجد بيانات أداء حتى الآن.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default MonitoringTab;
