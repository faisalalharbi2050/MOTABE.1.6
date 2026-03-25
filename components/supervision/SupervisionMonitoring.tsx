import React, { useState, useMemo } from 'react';
import {
  Eye, UserCheck, UserX, Clock, Check, AlertTriangle,
  CheckCircle, Calendar, Save,
  Bell, RefreshCw, Shield, ChevronRight, ChevronLeft
} from 'lucide-react';
import {
  SchoolInfo, SupervisionScheduleData, SupervisionAttendanceRecord,
  SupervisionAttendanceStatus, SupervisionDayAssignment
} from '../../types';
import { Badge } from '../ui/Badge';
import { DAYS, DAY_NAMES, getTimingConfig, getTodayAttendance, getAttendanceStats } from '../../utils/supervisionUtils';

interface Props {
  supervisionData: SupervisionScheduleData;
  setSupervisionData: React.Dispatch<React.SetStateAction<SupervisionScheduleData>>;
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

const SupervisionMonitoring: React.FC<Props> = ({
  supervisionData, setSupervisionData, schoolInfo, showToast
}) => {
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [withdrawalTimes, setWithdrawalTimes] = useState<Record<string, string>>({});
  const [lateTimes, setLateTimes] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});
  const dateInputRef = React.useRef<HTMLInputElement>(null);

  const timing = getTimingConfig(schoolInfo);

  // Determine current day of week from selected date
  const selectedDayOfWeek = useMemo(() => {
    const date = new Date(selectedDate);
    const dayIndex = date.getDay(); // 0=Sun, 1=Mon...
    const dayMap: Record<number, string> = { 0: 'sunday', 1: 'monday', 2: 'tuesday', 3: 'wednesday', 4: 'thursday', 5: 'friday', 6: 'saturday' };
    return dayMap[dayIndex] || 'sunday';
  }, [selectedDate]);

  // Get day assignment for current day
  const currentDayAssignment = useMemo(() => {
    return supervisionData.dayAssignments.find(da => da.day === selectedDayOfWeek);
  }, [supervisionData.dayAssignments, selectedDayOfWeek]);

  // Get existing attendance records for the selected date
  const existingRecords = useMemo(() => {
    return getTodayAttendance(supervisionData.attendanceRecords, selectedDate);
  }, [supervisionData.attendanceRecords, selectedDate]);

  // Build display list
  const supervisorsList = useMemo(() => {
    if (!currentDayAssignment) return [];
    return currentDayAssignment.staffAssignments.map(sa => {
      const existing = existingRecords.find(r => r.staffId === sa.staffId);
      return {
        ...sa,
        status: existing?.status || ('present' as SupervisionAttendanceStatus),
        withdrawalTime: existing?.withdrawalTime || '',
        lateTime: existing?.lateTime || '',
        notes: existing?.notes || '',
        isRecorded: !!existing,
      };
    });
  }, [currentDayAssignment, existingRecords]);

  // Check if already recorded
  const isAlreadyRecorded = existingRecords.length > 0;

  // Save attendance — يقبل قيم الوقت والملاحظة مباشرة لتجنب race condition
  const saveAttendance = (
    status: SupervisionAttendanceStatus,
    staffId: string,
    overrides?: { withdrawalTime?: string; lateTime?: string; notes?: string }
  ) => {
    const sa = currentDayAssignment?.staffAssignments.find(s => s.staffId === staffId);
    if (!sa) return;

    const record: SupervisionAttendanceRecord = {
      id: `att-${selectedDate}-${staffId}`,
      date: selectedDate,
      day: selectedDayOfWeek,
      staffId,
      staffType: sa.staffType,
      staffName: sa.staffName,
      status,
      withdrawalTime: status === 'withdrawn'
        ? (overrides?.withdrawalTime ?? withdrawalTimes[staffId] ?? '')
        : undefined,
      lateTime: status === 'late'
        ? (overrides?.lateTime ?? lateTimes[staffId] ?? '')
        : undefined,
      notes: overrides?.notes ?? notes[staffId] ?? '',
      recordedAt: new Date().toISOString(),
    };

    setSupervisionData(prev => {
      const existingIdx = prev.attendanceRecords.findIndex(
        r => r.date === selectedDate && r.staffId === staffId
      );
      const updated = [...prev.attendanceRecords];
      if (existingIdx >= 0) {
        updated[existingIdx] = record;
      } else {
        updated.push(record);
      }
      return { ...prev, attendanceRecords: updated };
    });
  };

  // Mark all present — دفعة واحدة لتجنب race condition في setState
  const markAllPresent = () => {
    if (!currentDayAssignment) return;
    const newRecords: SupervisionAttendanceRecord[] = currentDayAssignment.staffAssignments.map(sa => ({
      id: `att-${selectedDate}-${sa.staffId}`,
      date: selectedDate,
      day: selectedDayOfWeek,
      staffId: sa.staffId,
      staffType: sa.staffType,
      staffName: sa.staffName,
      status: 'present' as SupervisionAttendanceStatus,
      notes: notes[sa.staffId] ?? '',
      recordedAt: new Date().toISOString(),
    }));
    setSupervisionData(prev => {
      const filtered = prev.attendanceRecords.filter(
        r => r.date !== selectedDate || !newRecords.find(nr => nr.staffId === r.staffId)
      );
      return { ...prev, attendanceRecords: [...filtered, ...newRecords] };
    });
    showToast('تم تسجيل الحضور لجميع المشرفين', 'success');
  };

  // Navigate dates
  const changeDate = (delta: number) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + delta);
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  // Get stats
  const todayStats = getAttendanceStats(existingRecords);

  // Day name in Arabic
  const dayName = DAY_NAMES[selectedDayOfWeek] || '';
  const isWeekend = selectedDayOfWeek === 'friday' || selectedDayOfWeek === 'saturday';

  // Format Selected Date
  const formattedDate = useMemo(() => {
    const d = new Date(selectedDate);
    const calendarType = schoolInfo.semesters?.[0]?.calendarType || 'hijri';
    
    if (calendarType === 'hijri') {
      return new Intl.DateTimeFormat('ar-SA-u-ca-islamic', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      }).format(d);
    } else {
      return new Intl.DateTimeFormat('ar-SA', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      }).format(d);
    }
  }, [selectedDate, schoolInfo.semesters]);

  return (
    <div className="space-y-6">
      {/* Today Stats Summary */}
      <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-slate-100">
        <div className="mb-5">
          <h3 className="text-base font-black text-slate-800">ملخص أداء اليوم</h3>
          <p className="text-xs font-medium text-slate-500 mt-0.5">إحصائيات التاريخ المحدد أدناه</p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {[
            { label: 'حاضر',    value: todayStats.present,   numColor: 'text-green-600',  bg: 'bg-slate-50 border-slate-200' },
            { label: 'غائب',    value: todayStats.absent,    numColor: 'text-red-600',    bg: 'bg-slate-50 border-slate-200' },
            { label: 'مستأذن', value: todayStats.excused,   numColor: 'text-blue-600',   bg: 'bg-slate-50 border-slate-200' },
            { label: 'منسحب',  value: todayStats.withdrawn, numColor: 'text-orange-600', bg: 'bg-slate-50 border-slate-200' },
            { label: 'متأخر',  value: todayStats.late,      numColor: 'text-amber-600',  bg: 'bg-slate-50 border-slate-200' },
          ].map(s => (
            <div key={s.label} className={`${s.bg} border rounded-2xl p-4 text-center transition-transform hover:scale-105`}>
              <p className={`text-3xl font-black ${s.numColor} mb-1`}>{s.value}</p>
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
          {/* زر اليوم التالي (يمين في RTL = للأمام) */}
          <button
            onClick={() => changeDate(1)}
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

          {/* زر اليوم السابق */}
          <button
            onClick={() => changeDate(-1)}
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

      {/* Weekend Notice */}
      {isWeekend && (
        <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm flex items-center gap-4">
          <div className="shrink-0 w-11 h-11 rounded-xl bg-[#f3f0ff] flex items-center justify-center">
            <Calendar size={22} className="text-[#655ac1]" />
          </div>
          <div>
            <p className="font-black text-base text-slate-800">إجازة نهاية الأسبوع</p>
            <p className="text-sm text-slate-400 font-medium mt-0.5">لا يوجد إشراف في هذا اليوم — تمتع بعطلتك.</p>
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
            <p className="font-black text-base text-slate-800">لا يوجد جدول إشراف لهذا اليوم</p>
            <p className="text-sm text-slate-400 font-medium mt-0.5">يُرجى إنشاء جدول الإشراف أولاً لتتمكن من رصد الحضور.</p>
          </div>
        </div>
      )}

      {/* Monitoring Table */}
      {!isWeekend && currentDayAssignment && (
        <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-slate-100">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
            <div>
               <h3 className="text-lg font-black text-slate-800">متابعة حضور المشرفين</h3>
               {currentDayAssignment.followUpSupervisorName ? (
                 <div className="flex items-center gap-1.5 mt-0.5">
                   <Shield size={14} className="text-amber-600" />
                   <span className="text-xs font-medium text-slate-500">المشرف المتابع:</span>
                   <span className="text-xs font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-100">{currentDayAssignment.followUpSupervisorName}</span>
                 </div>
               ) : (
                 <p className="text-sm font-medium text-slate-500 mt-0.5">متابعة أداء المشرفين للإشراف اليومي</p>
               )}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {isAlreadyRecorded && (
                <Badge variant="info" className="px-3 py-1.5 text-xs font-bold shadow-sm bg-[#e5e1fe] text-[#655ac1] border-none">مرصود مسبقاً</Badge>
              )}
              <button
                onClick={markAllPresent}
                className="flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-5 py-2 rounded-xl text-sm font-bold shadow-sm transition-all hover:scale-105 active:scale-95 border border-emerald-600/20"
              >
                <Check size={16} />
                <span>حاضر للكل</span>
              </button>
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-slate-800 border-b border-slate-200">
                  <th className="py-4 px-4 text-right font-black">المشرف</th>
                  <th className="py-4 px-4 text-center font-black">الصفة</th>
                  <th className="py-4 px-4 text-center font-black">المواقع</th>
                  <th className="py-4 px-4 text-center font-black">الأداء</th>
                  <th className="py-4 px-4 text-center font-black">الوقت</th>
                  <th className="py-4 px-4 text-center font-black">ملاحظات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {supervisorsList.map(sup => {
                  const currentRecord = existingRecords.find(r => r.staffId === sup.staffId);
                  const currentStatus = currentRecord?.status || 'present';
                  const locations = sup.locationIds
                    .map(lid => supervisionData.locations.find(l => l.id === lid)?.name || '')
                    .filter(Boolean);

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
                      <td className="py-3 px-4 text-center">
                        <div className="flex flex-wrap gap-1 justify-center">
                          {locations.map((loc, i) => (
                            <span key={i} className="px-1.5 py-0.5 rounded text-[10px] bg-[#655ac1]/10 text-[#655ac1] font-bold">
                              {loc}
                            </span>
                          ))}
                          {locations.length === 0 && <span className="text-slate-300 text-xs">-</span>}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex justify-center gap-1.5 flex-nowrap w-max mx-auto">
                          {(Object.entries(STATUS_MAP) as [SupervisionAttendanceStatus, any][]).map(([status, config]) => (
                            <button
                              key={status}
                              onClick={() => saveAttendance(status, sup.staffId)}
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
                        {(currentStatus === 'withdrawn' || currentStatus === 'late') && (
                          <input
                            type="time"
                            value={
                              currentStatus === 'withdrawn'
                                ? (withdrawalTimes[sup.staffId] ?? currentRecord?.withdrawalTime ?? '')
                                : (lateTimes[sup.staffId] ?? currentRecord?.lateTime ?? '')
                            }
                            onChange={e => {
                              const val = e.target.value;
                              if (currentStatus === 'withdrawn') {
                                setWithdrawalTimes(prev => ({ ...prev, [sup.staffId]: val }));
                                saveAttendance(currentStatus, sup.staffId, { withdrawalTime: val });
                              } else {
                                setLateTimes(prev => ({ ...prev, [sup.staffId]: val }));
                                saveAttendance(currentStatus, sup.staffId, { lateTime: val });
                              }
                            }}
                            className="w-24 px-2 py-1 rounded border border-slate-200 text-xs outline-none focus:ring-1 focus:ring-[#655ac1]/30 text-center"
                          />
                        )}
                        {currentStatus !== 'withdrawn' && currentStatus !== 'late' && (
                          <span className="text-slate-300 text-xs">-</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <input
                          type="text"
                          placeholder="ملاحظة..."
                          value={notes[sup.staffId] ?? currentRecord?.notes ?? ''}
                          onChange={e => {
                            const val = e.target.value;
                            setNotes(prev => ({ ...prev, [sup.staffId]: val }));
                            saveAttendance(currentStatus, sup.staffId, { notes: val });
                          }}
                          className="w-full px-2 py-1 rounded border border-slate-200 text-xs outline-none focus:ring-1 focus:ring-[#655ac1]/30"
                        />
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
  );
};

export default SupervisionMonitoring;
