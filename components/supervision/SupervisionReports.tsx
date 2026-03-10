import React, { useState, useMemo } from 'react';
import {
  FileText, Printer, Download, Send, MessageSquare, Calendar,
  CheckCircle, Edit, Clock, BarChart3
} from 'lucide-react';
import {
  SchoolInfo, Teacher, Admin,
  SupervisionScheduleData, SupervisionMessage
} from '../../types';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Card } from '../ui/Card';
import {
  DAYS, DAY_NAMES, getTimingConfig, getSupervisionPrintData,
  getAttendanceStats, generateAssignmentMessage, generateReminderMessage
} from '../../utils/supervisionUtils';

interface Props {
  supervisionData: SupervisionScheduleData;
  schoolInfo: SchoolInfo;
  teachers: Teacher[];
  admins: Admin[];
  showToast: (msg: string, type: 'success' | 'warning' | 'error') => void;
}

const SupervisionReports: React.FC<Props> = ({
  supervisionData, schoolInfo, teachers, admins, showToast
}) => {
  const [activeSection, setActiveSection] = useState<'print' | 'messages' | 'stats'>('print');
  const [footerText, setFooterText] = useState(supervisionData.footerText || '');
  const [editingFooter, setEditingFooter] = useState(false);
  const [messageType, setMessageType] = useState<'assignment' | 'reminder'>('assignment');
  const [selectedDay, setSelectedDay] = useState<string>('all');

  const timing = getTimingConfig(schoolInfo);
  const activeDays = timing.activeDays || DAYS.slice();
  const printData = getSupervisionPrintData(supervisionData, schoolInfo);
  const stats = getAttendanceStats(supervisionData.attendanceRecords);

  // Generate messages for all assigned staff
  const messages = useMemo(() => {
    const msgs: SupervisionMessage[] = [];
    const daysToProcess = selectedDay === 'all' ? activeDays : [selectedDay];

    daysToProcess.forEach(day => {
      const da = supervisionData.dayAssignments.find(d => d.day === day);
      if (!da) return;

      da.staffAssignments.forEach(sa => {
        const locationNames = sa.locationIds
          .map(lid => supervisionData.locations.find(l => l.id === lid)?.name || '')
          .filter(Boolean);

        const content = messageType === 'assignment'
          ? generateAssignmentMessage(sa.staffName, sa.staffType, day, locationNames, supervisionData.effectiveDate, schoolInfo.gender)
          : generateReminderMessage(sa.staffName, sa.staffType, day, locationNames, schoolInfo.gender);

        msgs.push({
          id: `msg-${day}-${sa.staffId}`,
          staffId: sa.staffId,
          staffName: sa.staffName,
          type: messageType,
          channel: 'whatsapp',
          content,
          status: 'pending',
          day,
          locationNames,
        });
      });
    });

    return msgs;
  }, [supervisionData, messageType, selectedDay, activeDays]);

  // Print handler
  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8">
  <title>جدول الإشراف اليومي - ${printData.schoolName}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@300;400;500;700&display=swap');
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Tajawal', sans-serif; padding: 20px; direction: rtl; }
    .header { text-align: center; margin-bottom: 25px; border-bottom: 3px double #333; padding-bottom: 15px; }
    .header h1 { font-size: 22px; margin-bottom: 5px; }
    .header h2 { font-size: 16px; color: #555; }
    .header p { font-size: 13px; color: #777; margin-top: 5px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
    th, td { border: 1px solid #333; padding: 8px 12px; text-align: center; font-size: 13px; }
    th { background: #f5f5f5; font-weight: bold; }
    .day-header { background: #e8e5fa; font-weight: bold; font-size: 14px; }
    .footer { margin-top: 20px; text-align: center; font-size: 13px; color: #555; border-top: 2px solid #333; padding-top: 10px; }
    .signatures { margin-top: 30px; display: flex; justify-content: space-between; }
    .sig-block { text-align: center; width: 30%; }
    .sig-block p { font-size: 12px; margin-bottom: 5px; }
    .sig-line { border-bottom: 1px solid #333; margin-top: 40px; }
    @media print { body { padding: 0; } }
  </style>
</head>
<body>
  <div class="header">
    <h1>${printData.schoolName}</h1>
    <h2>${printData.title}</h2>
    <p>${printData.semester}</p>
  </div>

  <table>
    <thead>
      <tr>
        <th style="width: 12%;">اليوم</th>
        <th style="width: 25%;">اسم المشرف</th>
        <th style="width: 25%;">المواقع</th>
        <th style="width: 13%;">التوقيع</th>
        <th style="width: 13%;">المشرف المتابع</th>
        <th style="width: 12%;">توقيع المدير</th>
      </tr>
    </thead>
    <tbody>
      ${printData.days.map(day => {
        if (day.supervisors.length === 0) {
          return `<tr>
            <td class="day-header">${day.dayName}</td>
            <td colspan="5" style="color: #999;">لم يتم التعيين</td>
          </tr>`;
        }
        return day.supervisors.map((sup, idx) => `
          <tr>
            ${idx === 0 ? `<td class="day-header" rowspan="${day.supervisors.length}">${day.dayName}</td>` : ''}
            <td style="text-align: right;">${sup.name}</td>
            <td>${sup.locations || '-'}</td>
            <td></td>
            ${idx === 0 ? `<td rowspan="${day.supervisors.length}">${day.followUpSupervisor || ''}</td>` : ''}
            ${idx === 0 ? `<td rowspan="${day.supervisors.length}"></td>` : ''}
          </tr>
        `).join('');
      }).join('')}
    </tbody>
  </table>

  <div class="footer">
    <p>${footerText || printData.footerText}</p>
  </div>

  <div class="signatures">
    <div class="sig-block">
      <p>إعداد:</p>
      <div class="sig-line"></div>
    </div>
    <div class="sig-block">
      <p>مراجعة:</p>
      <div class="sig-line"></div>
    </div>
    <div class="sig-block">
      <p>اعتماد: ${schoolInfo.principal || ''}</p>
      <div class="sig-line"></div>
    </div>
  </div>
</body>
</html>
    `);

    printWindow.document.close();
    setTimeout(() => printWindow.print(), 300);
    showToast('تم فتح نافذة الطباعة', 'success');
  };

  // Weekly attendance report print
  const handlePrintAttendanceReport = (period: 'weekly' | 'monthly') => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const records = supervisionData.attendanceRecords;
    const staffMap: Record<string, { name: string; present: number; absent: number; late: number; excused: number; withdrawn: number }> = {};

    records.forEach(r => {
      if (!staffMap[r.staffId]) {
        staffMap[r.staffId] = { name: r.staffName, present: 0, absent: 0, late: 0, excused: 0, withdrawn: 0 };
      }
      staffMap[r.staffId][r.status]++;
    });

    printWindow.document.write(`
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8">
  <title>تقرير الإشراف ${period === 'weekly' ? 'الأسبوعي' : 'الشهري'}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@300;400;500;700&display=swap');
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Tajawal', sans-serif; padding: 20px; direction: rtl; }
    .header { text-align: center; margin-bottom: 25px; border-bottom: 3px double #333; padding-bottom: 15px; }
    .header h1 { font-size: 22px; margin-bottom: 5px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
    th, td { border: 1px solid #333; padding: 8px; text-align: center; font-size: 13px; }
    th { background: #f5f5f5; font-weight: bold; }
    @media print { body { padding: 0; } }
  </style>
</head>
<body>
  <div class="header">
    <h1>${schoolInfo.schoolName}</h1>
    <h2>تقرير الإشراف ${period === 'weekly' ? 'الأسبوعي' : 'الشهري'}</h2>
  </div>
  <table>
    <thead>
      <tr>
        <th>م</th>
        <th>اسم المشرف</th>
        <th>حاضر</th>
        <th>غائب</th>
        <th>متأخر</th>
        <th>مستأذن</th>
        <th>منسحب</th>
      </tr>
    </thead>
    <tbody>
      ${Object.entries(staffMap).map(([_, data], idx) => `
        <tr>
          <td>${idx + 1}</td>
          <td style="text-align: right;">${data.name}</td>
          <td style="color: green;">${data.present}</td>
          <td style="color: red;">${data.absent}</td>
          <td style="color: orange;">${data.late}</td>
          <td style="color: blue;">${data.excused}</td>
          <td style="color: brown;">${data.withdrawn}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>
</body>
</html>
    `);

    printWindow.document.close();
    setTimeout(() => printWindow.print(), 300);
    showToast('تم فتح تقرير الأداء', 'success');
  };

  return (
    <div className="space-y-6">
      {/* Section Tabs */}
      <div className="flex gap-2 bg-slate-100 rounded-xl p-1">
        {[
          { id: 'print', label: 'الطباعة والتصدير', icon: <Printer size={16} /> },
          { id: 'messages', label: 'الرسائل', icon: <MessageSquare size={16} /> },
          { id: 'stats', label: 'تقارير الأداء', icon: <BarChart3 size={16} /> },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveSection(tab.id as any)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-bold flex-1 justify-center transition-all ${
              activeSection === tab.id ? 'bg-white text-[#655ac1] shadow-sm' : 'text-slate-500'
            }`}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* Print Section */}
      {activeSection === 'print' && (
        <div className="space-y-4">
          <Card>
            <h3 className="text-lg font-black text-slate-800 flex items-center gap-2 mb-4">
              <Printer size={20} className="text-[#655ac1]" />
              طباعة جدول الإشراف
            </h3>

            {/* Footer Text Edit */}
            <div className="bg-slate-50 rounded-xl p-4 mb-4">
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-bold text-slate-600">نص التذييل</label>
                <button
                  onClick={() => setEditingFooter(!editingFooter)}
                  className="p-1.5 rounded-lg hover:bg-white text-slate-400"
                >
                  <Edit size={14} />
                </button>
              </div>
              {editingFooter ? (
                <textarea
                  value={footerText}
                  onChange={e => setFooterText(e.target.value)}
                  placeholder={printData.footerText}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-[#655ac1]/30 focus:border-[#655ac1] outline-none resize-none"
                  rows={2}
                />
              ) : (
                <p className="text-sm text-slate-600">{footerText || printData.footerText}</p>
              )}
            </div>

            {/* Preview */}
            <div className="bg-white border border-slate-200 rounded-xl p-6 mb-4 max-h-96 overflow-y-auto">
              <div className="text-center mb-4 pb-4 border-b-2 border-double border-slate-300">
                <h4 className="text-lg font-black">{printData.schoolName}</h4>
                <h5 className="text-sm font-bold text-slate-500">{printData.title}</h5>
              </div>

              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100">
                    <th className="border border-slate-300 p-2">اليوم</th>
                    <th className="border border-slate-300 p-2">المشرف</th>
                    <th className="border border-slate-300 p-2">المواقع</th>
                    <th className="border border-slate-300 p-2">التوقيع</th>
                    <th className="border border-slate-300 p-2">المشرف المتابع</th>
                    <th className="border border-slate-300 p-2">توقيع المدير</th>
                  </tr>
                </thead>
                <tbody>
                  {printData.days.map(day => (
                    <React.Fragment key={day.dayName}>
                      {day.supervisors.length === 0 ? (
                        <tr>
                          <td className="border border-slate-300 p-2 font-bold bg-slate-50">{day.dayName}</td>
                          <td className="border border-slate-300 p-2 text-slate-300" colSpan={5}>—</td>
                        </tr>
                      ) : (
                        day.supervisors.map((sup, idx) => (
                          <tr key={idx}>
                            {idx === 0 && (
                              <td className="border border-slate-300 p-2 font-bold bg-slate-50" rowSpan={day.supervisors.length}>
                                {day.dayName}
                              </td>
                            )}
                            <td className="border border-slate-300 p-2">{sup.name}</td>
                            <td className="border border-slate-300 p-2">{sup.locations || '-'}</td>
                            <td className="border border-slate-300 p-2"></td>
                            {idx === 0 && (
                              <td className="border border-slate-300 p-2 text-amber-700 font-bold" rowSpan={day.supervisors.length}>
                                {day.followUpSupervisor || '—'}
                              </td>
                            )}
                            {idx === 0 && (
                              <td className="border border-slate-300 p-2" rowSpan={day.supervisors.length}></td>
                            )}
                          </tr>
                        ))
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>

              <p className="text-center mt-4 text-xs text-slate-500 border-t border-slate-200 pt-3">
                {footerText || printData.footerText}
              </p>
            </div>

            <div className="flex gap-3">
              <Button variant="primary" icon={Printer} onClick={handlePrint}>
                طباعة الجدول PDF
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Messages Section */}
      {activeSection === 'messages' && (
        <div className="space-y-4">
          <Card>
            <h3 className="text-lg font-black text-slate-800 flex items-center gap-2 mb-4">
              <MessageSquare size={20} className="text-[#655ac1]" />
              نظام الرسائل
            </h3>

            {/* Message Type & Day Filter */}
            <div className="flex flex-wrap gap-3 mb-4">
              <div className="flex gap-1 bg-slate-100 rounded-lg p-1">
                <button
                  onClick={() => setMessageType('assignment')}
                  className={`px-3 py-1.5 rounded-md text-xs font-bold ${
                    messageType === 'assignment' ? 'bg-white text-[#655ac1] shadow-sm' : 'text-slate-500'
                  }`}
                >
                  رسالة التكليف
                </button>
                <button
                  onClick={() => setMessageType('reminder')}
                  className={`px-3 py-1.5 rounded-md text-xs font-bold ${
                    messageType === 'reminder' ? 'bg-white text-[#655ac1] shadow-sm' : 'text-slate-500'
                  }`}
                >
                  رسالة تذكيرية
                </button>
              </div>

              <select
                value={selectedDay}
                onChange={e => setSelectedDay(e.target.value)}
                className="px-3 py-1.5 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-[#655ac1]/30 outline-none"
              >
                <option value="all">جميع الأيام</option>
                {activeDays.map(day => (
                  <option key={day} value={day}>{DAY_NAMES[day]}</option>
                ))}
              </select>
            </div>

            {/* Messages List */}
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {messages.length === 0 && (
                <div className="text-center py-8 text-slate-400 text-sm">
                  <MessageSquare size={32} className="mx-auto mb-2 text-slate-300" />
                  لا توجد رسائل - يُرجى إعداد جدول الإشراف أولاً
                </div>
              )}
              {messages.map(msg => (
                <div key={msg.id} className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-slate-700">{msg.staffName}</span>
                      <Badge variant="info">{DAY_NAMES[msg.day]}</Badge>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(msg.content);
                          showToast('تم نسخ الرسالة', 'success');
                        }}
                        className="px-2 py-1 rounded-lg bg-white border border-slate-200 text-xs font-bold text-slate-500 hover:text-[#655ac1] hover:border-[#655ac1]/30 transition-all"
                      >
                        نسخ
                      </button>
                      <button
                        onClick={() => {
                          const phone = [...teachers, ...admins].find(s => s.id === msg.staffId)?.phone;
                          if (phone) {
                            window.open(`https://wa.me/${phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(msg.content)}`, '_blank');
                          } else {
                            showToast('لم يتم العثور على رقم الهاتف', 'warning');
                          }
                        }}
                        className="px-2 py-1 rounded-lg bg-green-500 text-white text-xs font-bold hover:bg-green-600 transition-all flex items-center gap-1"
                      >
                        <Send size={10} /> واتساب
                      </button>
                    </div>
                  </div>
                  <p className="text-sm text-slate-600 bg-white rounded-lg p-3 border border-slate-100">
                    {msg.content}
                  </p>
                </div>
              ))}
            </div>

            {messages.length > 0 && (
              <div className="mt-4 flex gap-3">
                <Button
                  variant="primary"
                  icon={Send}
                  onClick={() => showToast(`سيتم إرسال ${messages.length} رسالة`, 'success')}
                >
                  إرسال الكل ({messages.length} رسالة)
                </Button>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* Stats Section */}
      {activeSection === 'stats' && (
        <div className="space-y-4">
          <Card>
            <h3 className="text-lg font-black text-slate-800 flex items-center gap-2 mb-4">
              <BarChart3 size={20} className="text-[#655ac1]" />
              تقارير الأداء
            </h3>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
              <div className="bg-green-50 rounded-xl p-4 text-center border border-green-100">
                <p className="text-3xl font-black text-green-600">{stats.present}</p>
                <p className="text-xs font-bold text-green-500">حاضر</p>
              </div>
              <div className="bg-red-50 rounded-xl p-4 text-center border border-red-100">
                <p className="text-3xl font-black text-red-600">{stats.absent}</p>
                <p className="text-xs font-bold text-red-500">غائب</p>
              </div>
              <div className="bg-blue-50 rounded-xl p-4 text-center border border-blue-100">
                <p className="text-3xl font-black text-blue-600">{stats.excused}</p>
                <p className="text-xs font-bold text-blue-500">مستأذن</p>
              </div>
              <div className="bg-orange-50 rounded-xl p-4 text-center border border-orange-100">
                <p className="text-3xl font-black text-orange-600">{stats.withdrawn}</p>
                <p className="text-xs font-bold text-orange-500">منسحب</p>
              </div>
              <div className="bg-amber-50 rounded-xl p-4 text-center border border-amber-100">
                <p className="text-3xl font-black text-amber-600">{stats.late}</p>
                <p className="text-xs font-bold text-amber-500">متأخر</p>
              </div>
            </div>

            {/* Overall Chart (simplified bar) */}
            {stats.total > 0 && (
              <div className="bg-slate-50 rounded-xl p-4 mb-4">
                <p className="text-sm font-bold text-slate-600 mb-3">نسبة الحضور الإجمالية</p>
                <div className="w-full bg-slate-200 rounded-full h-6 overflow-hidden flex">
                  {stats.present > 0 && (
                    <div
                      className="bg-green-500 h-full flex items-center justify-center text-white text-[10px] font-bold"
                      style={{ width: `${(stats.present / stats.total) * 100}%` }}
                    >
                      {Math.round((stats.present / stats.total) * 100)}%
                    </div>
                  )}
                  {stats.late > 0 && (
                    <div
                      className="bg-amber-400 h-full flex items-center justify-center text-white text-[10px] font-bold"
                      style={{ width: `${(stats.late / stats.total) * 100}%` }}
                    />
                  )}
                  {stats.absent > 0 && (
                    <div
                      className="bg-red-400 h-full flex items-center justify-center text-white text-[10px] font-bold"
                      style={{ width: `${(stats.absent / stats.total) * 100}%` }}
                    />
                  )}
                </div>
              </div>
            )}

            {/* Export Buttons */}
            <div className="flex gap-3">
              <Button variant="primary" icon={Printer} onClick={() => handlePrintAttendanceReport('weekly')}>
                تقرير أسبوعي
              </Button>
              <Button variant="secondary" icon={FileText} onClick={() => handlePrintAttendanceReport('monthly')}>
                تقرير شهري
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

export default SupervisionReports;
