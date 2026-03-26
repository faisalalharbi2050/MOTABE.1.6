import React, { useState, useMemo, useRef } from 'react';
import {
  Eye, UserCheck, UserX, Clock, Check, AlertTriangle,
  CheckCircle, Calendar, ChevronLeft, ChevronRight, Save,
  Shield, X
} from 'lucide-react';
import {
  SchoolInfo, DutyScheduleData, DutyReportRecord,
  SupervisionAttendanceStatus
} from '../../types';
import { Badge } from '../ui/Badge';
import { DAYS, DAY_NAMES, getTimingConfig, getTodayDutyReports, getDutyStats } from '../../utils/dutyUtils';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  dutyData: DutyScheduleData;
  setDutyData: React.Dispatch<React.SetStateAction<DutyScheduleData>>;
  schoolInfo: SchoolInfo;
  showToast: (msg: string, type: 'success' | 'warning' | 'error') => void;
}

const STATUS_MAP: Record<SupervisionAttendanceStatus, { label: string; color: string; icon: React.ReactNode }> = {
  present: { label: 'حاضر', color: 'bg-green-100 text-green-700 border-green-200', icon: <CheckCircle size={14} /> },
  absent: { label: 'غائب', color: 'bg-red-100 text-red-700 border-red-200', icon: <UserX size={14} /> },
  excused: { label: 'مستأذن', color: 'bg-blue-100 text-blue-700 border-blue-200', icon: <Clock size={14} /> },
  withdrawn: { label: 'منسحب', color: 'bg-orange-100 text-orange-700 border-orange-200', icon: <AlertTriangle size={14} /> },
  late: { label: 'متأخر', color: 'bg-amber-100 text-amber-700 border-amber-200', icon: <Clock size={14} /> },
};

const DutyMonitoringModal: React.FC<Props> = ({
  isOpen, onClose, dutyData, setDutyData, schoolInfo, showToast
}) => {
  // ===== ALL HOOKS BEFORE ANY EARLY RETURN =====
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [withdrawalTimes, setWithdrawalTimes] = useState<Record<string, string>>({});
  const dateInputRef = useRef<HTMLInputElement>(null);

  const timing = getTimingConfig(schoolInfo);

  const selectedDayOfWeek = useMemo(() => {
    const date = new Date(selectedDate);
    const dayIndex = date.getDay();
    const dayMap: Record<number, string> = { 0: 'sunday', 1: 'monday', 2: 'tuesday', 3: 'wednesday', 4: 'thursday', 5: 'friday', 6: 'saturday' };
    return dayMap[dayIndex] || 'sunday';
  }, [selectedDate]);

  const currentDayAssignment = useMemo(() => {
    // Try matching by exact date first (multi-week support)
    const exactMatch = dutyData.dayAssignments.find(da => da.date === selectedDate);
    if (exactMatch) return exactMatch;
    // Fallback for older schedules without dates
    return dutyData.dayAssignments.find(da => da.day === selectedDayOfWeek);
  }, [dutyData.dayAssignments, selectedDate, selectedDayOfWeek]);

  const existingReports = useMemo(() => {
    return getTodayDutyReports(dutyData.reports, selectedDate);
  }, [dutyData.reports, selectedDate]);

  const dutyStaffList = useMemo(() => {
    if (!currentDayAssignment) return [];
    return (currentDayAssignment.staffAssignments || []).map(sa => {
      const existing = existingReports.find(r => r.staffId === sa.staffId);
      return {
        ...sa,
        status: existing?.status || ('present' as SupervisionAttendanceStatus),
        withdrawalTime: existing?.withdrawalTime || '',
        isSubmitted: existing?.isSubmitted || false,
      };
    });
  }, [currentDayAssignment, existingReports]);

  const formattedDate = useMemo(() => {
    const d = new Date(selectedDate);
    const calendarType = schoolInfo.semesters?.[0]?.calendarType || 'hijri';
    if (calendarType === 'hijri') {
      return new Intl.DateTimeFormat('ar-SA-u-ca-islamic', {
        day: 'numeric', month: 'long', year: 'numeric'
      }).format(d);
    } else {
      return new Intl.DateTimeFormat('ar-SA', {
        day: 'numeric', month: 'long', year: 'numeric'
      }).format(d);
    }
  }, [selectedDate, schoolInfo.semesters]);

  // ===== EARLY RETURN AFTER ALL HOOKS =====
  if (!isOpen) return null;

  // ===== NON-HOOK LOGIC =====
  const isAlreadyRecorded = existingReports.length > 0;
  const todayStats = getDutyStats(existingReports);
  const dayName = DAY_NAMES[selectedDayOfWeek] || '';
  const isWeekend = selectedDayOfWeek === 'friday' || selectedDayOfWeek === 'saturday';

  const saveAttendanceStatus = (status: SupervisionAttendanceStatus, staffId: string) => {
    const sa = (currentDayAssignment?.staffAssignments || []).find(s => s.staffId === staffId);
    if (!sa) return;

    setDutyData(prev => {
      const existingIdx = prev.reports.findIndex(
        r => r.date === selectedDate && r.staffId === staffId
      );
      const updated = [...prev.reports];
      if (existingIdx >= 0) {
        updated[existingIdx] = {
          ...updated[existingIdx],
          status,
          withdrawalTime: status === 'withdrawn' ? (withdrawalTimes[staffId] || updated[existingIdx].withdrawalTime || '') : undefined,
        };
      } else {
        const newReport: DutyReportRecord = {
          id: `duty-rep-${selectedDate}-${staffId}`,
          date: selectedDate,
          day: selectedDayOfWeek,
          staffId,
          staffName: sa.staffName,
          status,
          withdrawalTime: status === 'withdrawn' ? (withdrawalTimes[staffId] || '') : undefined,
          lateStudents: [],
          violatingStudents: [],
          isSubmitted: false
        };
        updated.push(newReport);
      }
      return { ...prev, reports: updated };
    });
  };

  const markAllPresent = () => {
    if (!currentDayAssignment || !currentDayAssignment.staffAssignments) return;
    currentDayAssignment.staffAssignments.forEach(sa => {
      saveAttendanceStatus('present', sa.staffId);
    });
    showToast('تم تسجيل الحضور لجميع المناوبين', 'success');
  };

  const changeDate = (delta: number) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + delta);
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-slate-50 rounded-3xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <Eye size={24} className="text-[#655ac1]" />
            <div>
              <h2 className="text-xl font-black text-slate-800">المتابعة اليومية</h2>
              <p className="text-sm font-medium text-slate-500 mt-0.5">متابعة أداء المناوبين للمناوبة اليومية</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2.5 rounded-xl hover:bg-slate-100 text-slate-400 transition-colors">
            <X size={22} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-6">

            {/* Today Stats Summary */}
            <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-slate-100">
              <div className="mb-5">
                <h3 className="text-base font-black text-slate-800">ملخص أداء اليوم</h3>
                <p className="text-xs font-medium text-slate-500 mt-0.5">إحصائيات التاريخ المحدد أدناه</p>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { label: 'حاضر', val: todayStats.present, color: 'text-green-600', bg: 'bg-slate-50 border-slate-100' },
                  { label: 'غائب', val: todayStats.absent, color: 'text-red-500', bg: 'bg-slate-50 border-slate-100' },
                  { label: 'مستأذن', val: todayStats.excused, color: 'text-blue-500', bg: 'bg-slate-50 border-slate-100' },
                  { label: 'منسحب', val: todayStats.withdrawn, color: 'text-orange-500', bg: 'bg-slate-50 border-slate-100' },
                ].map(s => (
                  <div key={s.label} className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-center transition-transform hover:scale-105">
                    <p className={`text-3xl font-black ${s.color} mb-1`}>{s.val}</p>
                    <p className="text-sm font-bold text-slate-500">{s.label}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Date Navigation */}
            <div className="bg-white rounded-[2rem] p-5 shadow-sm border border-slate-100 relative group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-[#e5e1fe]/50 to-transparent rounded-br-full -z-0 pointer-events-none" />
              <p className="text-xs font-black text-slate-400 uppercase tracking-wider mb-3 relative z-10">اليوم والتاريخ</p>
              <div className="relative z-10 flex items-center gap-2">
                <button
                  onClick={() => { const d = new Date(selectedDate); d.setDate(d.getDate() + 1); setSelectedDate(d.toISOString().split('T')[0]); }}
                  className="p-2.5 rounded-xl bg-slate-50 hover:bg-[#f5f3ff] border border-slate-200 hover:border-[#655ac1]/40 text-slate-400 hover:text-[#655ac1] transition-all active:scale-95"
                  title="اليوم التالي"
                >
                  <ChevronRight size={18} />
                </button>
                <button
                  type="button"
                  onClick={() => dateInputRef.current?.showPicker()}
                  className="cursor-pointer inline-flex items-center gap-3 bg-slate-50 hover:bg-[#f5f3ff] border border-slate-200 hover:border-[#655ac1]/40 px-5 py-3 rounded-2xl transition-all"
                  title="اضغط لاختيار تاريخ محدد"
                >
                  <Calendar size={18} className="text-[#655ac1]" />
                  <div>
                    <p className="text-base font-black text-[#655ac1]">{dayName}</p>
                    <p className="text-sm font-medium text-slate-500">{formattedDate}</p>
                  </div>
                </button>
                <button
                  onClick={() => { const d = new Date(selectedDate); d.setDate(d.getDate() - 1); setSelectedDate(d.toISOString().split('T')[0]); }}
                  className="p-2.5 rounded-xl bg-slate-50 hover:bg-[#f5f3ff] border border-slate-200 hover:border-[#655ac1]/40 text-slate-400 hover:text-[#655ac1] transition-all active:scale-95"
                  title="اليوم السابق"
                >
                  <ChevronLeft size={18} />
                </button>
                <input
                  ref={dateInputRef}
                  type="date"
                  value={selectedDate}
                  onChange={e => setSelectedDate(e.target.value)}
                  className="absolute opacity-0 pointer-events-none w-0 h-0 bottom-0 right-0"
                />
              </div>
            </div>

            {/* Weekend / Official Leave Notice */}
            {isWeekend && (
              <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm flex items-center gap-4">
                <div className="shrink-0 w-11 h-11 rounded-xl bg-[#f3f0ff] flex items-center justify-center">
                  <Calendar size={22} className="text-[#655ac1]" />
                </div>
                <div>
                  <p className="font-black text-base text-slate-800">إجازة رسمية</p>
                  <p className="text-sm text-slate-400 font-medium mt-0.5">لا يوجد مناوبة في هذا اليوم — تمتع بعطلتك.</p>
                </div>
              </div>
            )}

            {/* No assignment */}
            {!isWeekend && !currentDayAssignment && (
              <div className="bg-white border border-amber-100 rounded-2xl p-5 shadow-sm flex items-center gap-4">
                <div className="shrink-0 w-11 h-11 rounded-xl bg-amber-50 flex items-center justify-center">
                  <AlertTriangle size={22} className="text-amber-500" />
                </div>
                <div>
                  <p className="font-black text-base text-slate-800">لم يتم تعيين مناوبين لهذا اليوم</p>
                  <p className="text-sm text-slate-400 font-medium mt-0.5">يُرجى إعداد جدول المناوبة أولاً لتتمكن من رصد الحضور ومتابعة التقارير.</p>
                </div>
              </div>
            )}

            {/* Monitoring Table */}
            {!isWeekend && currentDayAssignment && (
              <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-slate-100">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
                  <div>
                    <h3 className="text-lg font-black text-slate-800">
                      متابعة حضور المناوبين - {dayName}
                    </h3>
                    <p className="text-sm font-medium text-slate-500 mt-0.5">متابعة أداء المناوبين للمناوبة اليومية</p>
                  </div>
                  {isAlreadyRecorded && (
                    <Badge variant="info" className="px-3 py-1.5 text-xs font-bold shadow-sm bg-[#e5e1fe] text-[#655ac1] border-none">مرصود مسبقاً</Badge>
                  )}
                </div>

                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-slate-50 text-slate-800 border-b border-slate-200">
                        <th className="py-4 px-4 text-right font-black">المناوب</th>
                        <th className="py-4 px-4 text-center font-black">الصفة</th>
                        <th className="py-4 px-4 text-center font-black">الأداء</th>
                        <th className="py-4 px-4 text-center font-black">الوقت</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {dutyStaffList.map(sup => {
                        const currentStatus = sup.status;
                        return (
                          <tr key={sup.staffId} className="hover:bg-slate-50/50 transition-colors">
                            <td className="py-3 px-4">
                              <span className="font-bold text-slate-700">{sup.staffName}</span>
                            </td>
                            <td className="py-3 px-4 text-center">
                              <Badge variant={sup.staffType === 'teacher' ? 'info' : 'neutral'}>
                                {sup.staffType === 'teacher' ? 'معلم' : 'إداري'}
                              </Badge>
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex justify-center gap-1.5 flex-nowrap w-max mx-auto">
                                {(Object.entries(STATUS_MAP) as [SupervisionAttendanceStatus, any][]).filter(([status]) => status !== 'late').map(([status, config]) => (
                                  <button
                                    key={status}
                                    onClick={() => saveAttendanceStatus(status, sup.staffId)}
                                    className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all whitespace-nowrap active:scale-95 flex-shrink-0 ${
                                      currentStatus === status
                                        ? config.color + ' ring-2 ring-offset-1 ring-current/20 shadow-sm'
                                        : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300 hover:bg-slate-50'
                                    }`}
                                    title={config.label}
                                  >
                                    {config.label}
                                  </button>
                                ))}
                              </div>
                            </td>
                            <td className="py-3 px-4 text-center">
                              {currentStatus === 'withdrawn' ? (
                                <input
                                  type="time"
                                  value={withdrawalTimes[sup.staffId] || sup.withdrawalTime || ''}
                                  onChange={e => {
                                    setWithdrawalTimes(prev => ({ ...prev, [sup.staffId]: e.target.value }));
                                    saveAttendanceStatus(currentStatus, sup.staffId);
                                  }}
                                  className="w-24 px-2 py-1 rounded border border-slate-200 text-xs outline-none focus:ring-1 focus:ring-[#655ac1]/30 text-center"
                                />
                              ) : (
                                <span className="text-slate-300 text-xs">-</span>
                              )}
                            </td>

                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Auto-save indicator */}
                <div className="mt-4 flex items-center gap-2 text-xs font-bold text-slate-400 justify-center sm:justify-start bg-slate-50 py-2 px-4 rounded-xl w-max">
                  <Save size={14} className="text-emerald-500" />
                  يتم حفظ التعديلات تلقائياً
                </div>
              </div>
            )}


          </div>
        </div>
      </div>
    </div>
  );
};

export default DutyMonitoringModal;
