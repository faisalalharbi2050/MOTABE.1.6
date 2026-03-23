import React, { useState, useRef } from 'react';
import { FileText, Printer, Send, Download, FileSpreadsheet, Calendar, MessageCircle, Smartphone, Upload } from 'lucide-react';
import { SchoolInfo, Teacher, Subject, ClassInfo, Assignment, Specialization, TimetableData } from '../../types';
import { generateExtensionXML, downloadFile } from '../../utils/scheduleExport';
import { getKey } from '../../utils/scheduleInteractive';
import PrintOptionsModal from '../schedule/PrintOptionsModal';
import SendScheduleModal from '../schedule/SendScheduleModal';

interface ScheduleReportsProps {
  schoolInfo: SchoolInfo;
  teachers: Teacher[];
  subjects: Subject[];
  classes: ClassInfo[];
  assignments: Assignment[];
  specializations: Specialization[];
  timetable: TimetableData;
}

const ScheduleReports: React.FC<ScheduleReportsProps> = ({
  schoolInfo,
  teachers,
  subjects,
  classes,
  assignments,
  specializations,
  timetable
}) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [showSendModal, setShowSendModal] = useState(false);

  // Print functionality
  const handlePrint = () => {
    setShowPrintModal(true);
  };

  // Send functionality (email)
  const handleSend = () => {
    setShowSendModal(true);
  };

  const generateEmailContent = () => {
    return `
تصدير الجدول الدراسي
المدرسة: ${schoolInfo.schoolName}
العام الدراسي: ${schoolInfo.academicYear || '1445'}

الإحصائيات:
- عدد المعلمين: ${teachers.length}
- عدد المواد: ${subjects.length}
- عدد الفصول: ${classes.length}
- عدد الحصص المجدولة: ${assignments.length}

تم إنشاء هذا التقرير عبر نظام متابع.
    `;
  };

  // XML Export functionality
  const handleExportXML = () => {
    setIsGenerating(true);
    try {
      const xmlData = generateExtensionXML(timetable, teachers, subjects, classes, schoolInfo);
      downloadFile(xmlData, `schedule-${schoolInfo.schoolName}-${new Date().toISOString().split('T')[0]}.xml`, 'application/xml');
    } catch (error) {
      console.error('Error generating XML:', error);
      alert('حدث خطأ أثناء تصدير الملف XML');
    } finally {
      setIsGenerating(false);
    }
  };

  // Excel Export functionality
  const handleExportExcel = () => {
    setIsGenerating(true);
    try {
      // Generate CSV content for Excel
      const csvContent = generateCSVContent();
      downloadFile(csvContent, `schedule-${schoolInfo.schoolName}-${new Date().toISOString().split('T')[0]}.csv`, 'text/csv');
    } catch (error) {
      console.error('Error generating Excel:', error);
      alert('حدث خطأ أثناء تصدير الملف Excel');
    } finally {
      setIsGenerating(false);
    }
  };

  const generateCSVContent = () => {
    const headers = ['المعلم', 'المادة', 'الفصل', 'اليوم', 'الحصة'];
    const rows = Object.entries(timetable).map(([key, slot]) => {
      const [teacherId, day, period] = key.split('-');
      const teacher = teachers.find(t => t.id === teacherId);
      const subject = subjects.find(s => s.id === slot.subjectId);
      const cls = classes.find(c => c.id === slot.classId);
      
      return [
        teacher?.name || '',
        subject?.name || '',
        cls?.name || '',
        day || '',
        period || ''
      ].join(',');
    });
    
    return [headers.join(','), ...rows].join('\n');
  };

  return (
    <div className="space-y-6 pb-20">

      {/* ══════ Header ══════ */}
      <div className="bg-white rounded-[2rem] p-8 shadow-sm border border-slate-100 relative group hover:shadow-md transition-all duration-300 overflow-hidden mb-6">
          <div className="absolute top-0 right-0 w-32 h-32 bg-[#e5e1fe] rounded-bl-[4rem] -z-0 transition-transform group-hover:scale-110 duration-500"></div>

          <h3 className="text-xl font-black text-slate-800 flex items-center gap-3 relative z-10">
            <Download size={36} strokeWidth={1.8} className="text-[#655ac1]" />
             تصدير الجدول
          </h3>
          <p className="text-slate-500 font-medium mt-2 mr-12 relative z-10">تصدير وطباعة الجداول الدراسية عبر واجهة تفاعلية وسلسة</p>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto space-y-6">
        {/* Export Actions */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100">
          <h3 className="text-lg font-bold text-slate-800 mb-6">خيارات التصدير والطباعة</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Print Button */}
            <button
              onClick={handlePrint}
              className="flex flex-col items-center gap-3 p-6 bg-slate-50 hover:bg-slate-100 rounded-xl transition-colors group"
            >
              <div className="w-12 h-12 text-white rounded-lg flex items-center justify-center group-hover:opacity-80 transition-colors" style={{backgroundColor: '#8779fb'}}>
                <Printer size={20} />
              </div>
              <div className="text-center">
                <p className="font-bold text-slate-800">معاينة وطباعة</p>
                <p className="text-xs text-slate-500">معاينة وطباعة الجدول</p>
              </div>
            </button>

            {/* Send Button */}
            <button
              onClick={handleSend}
              className="flex flex-col items-center gap-3 p-6 bg-slate-50 hover:bg-slate-100 rounded-xl transition-colors group"
            >
              <div className="w-12 h-12 text-white rounded-lg flex items-center justify-center group-hover:opacity-80 transition-colors" style={{backgroundColor: '#8779fb'}}>
                <Send size={20} />
              </div>
              <div className="text-center">
                <p className="font-bold text-slate-800">إرسال</p>
                <div className="flex items-center justify-center gap-1 mt-1">
                  <span className="text-xs text-slate-600">واتساب - نصية</span>
                </div>
              </div>
            </button>

            {/* XML Export Button */}
            <button
              onClick={handleExportXML}
              disabled={isGenerating}
              className="flex flex-col items-center gap-3 p-6 bg-slate-50 hover:bg-slate-100 rounded-xl transition-colors group disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="w-12 h-12 text-white rounded-lg flex items-center justify-center group-hover:opacity-80 transition-colors" style={{backgroundColor: '#8779fb'}}>
                <Download size={20} />
              </div>
              <div className="text-center">
                <p className="font-bold text-slate-800">تصدير XML</p>
                <p className="text-xs text-slate-500">تصدير بصيغة XML</p>
              </div>
            </button>

            {/* Excel Export Button */}
            <button
              onClick={handleExportExcel}
              disabled={isGenerating}
              className="flex flex-col items-center gap-3 p-6 bg-slate-50 hover:bg-slate-100 rounded-xl transition-colors group disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="w-12 h-12 text-white rounded-lg flex items-center justify-center group-hover:opacity-80 transition-colors" style={{backgroundColor: '#8779fb'}}>
                <FileSpreadsheet size={20} />
              </div>
              <div className="text-center">
                <p className="font-bold text-slate-800">تصدير Excel</p>
                <p className="text-xs text-slate-500">تصدير بصيغة Excel</p>
              </div>
            </button>
          </div>
        </div>

        {/* Preview Section (Hidden, used for printing) */}
        <div ref={printRef} className="hidden">
          <div className="header">
            <h1 className="title">تصدير الجدول الدراسي</h1>
            <p className="subtitle">{schoolInfo.schoolName} - {schoolInfo.academicYear || '1445'}</p>
          </div>
          
          <table>
            <thead>
              <tr>
                <th>المعلم</th>
                <th>المادة</th>
                <th>الفصل</th>
                <th>اليوم</th>
                <th>الحصة</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(timetable).map(([key, slot], index) => {
                const [teacherId, day, period] = key.split('-');
                const teacher = teachers.find(t => t.id === teacherId);
                const subject = subjects.find(s => s.id === slot.subjectId);
                const cls = classes.find(c => c.id === slot.classId);
                
                return (
                  <tr key={index}>
                    <td>{teacher?.name || ''}</td>
                    <td>{subject?.name || ''}</td>
                    <td>{cls?.name || ''}</td>
                    <td>{day || ''}</td>
                    <td>{period || ''}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Print Options Modal */}
      <PrintOptionsModal
        isOpen={showPrintModal}
        onClose={() => setShowPrintModal(false)}
        settings={{
          timetable: timetable,
          savedSchedules: [],
          activeScheduleId: '',
          subjectConstraints: [],
          teacherConstraints: [],
          meetings: [],
          substitution: {
            method: 'auto',
            maxTotalQuota: 24,
            maxDailyTotal: 5,
            fixedPerPeriod: 1
          }
        }}
        teachers={teachers}
        classes={classes}
        subjects={subjects}
        schoolInfo={schoolInfo}
      />

      {/* Send Schedule Modal */}
      <SendScheduleModal
        isOpen={showSendModal}
        onClose={() => setShowSendModal(false)}
        teachers={teachers}
        classes={classes}
      />
    </div>
  );
};

export default ScheduleReports;
