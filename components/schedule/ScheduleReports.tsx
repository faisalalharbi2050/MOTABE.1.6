import React, { useState, useRef } from 'react';
import { FileText, Printer, Send, Download, FileSpreadsheet, Calendar, MessageCircle, Smartphone, Upload, LayoutGrid, X, School, Check } from 'lucide-react';
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
  generationMode?: 'unified' | 'separate';
}

const ScheduleReports: React.FC<ScheduleReportsProps> = ({
  schoolInfo,
  teachers,
  subjects,
  classes,
  assignments,
  specializations,
  timetable,
  generationMode = 'unified'
}) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [showSendModal, setShowSendModal] = useState(false);

  const hasSharedSchools = schoolInfo.sharedSchools && schoolInfo.sharedSchools.length > 0;
  const isSeparateMode = hasSharedSchools && generationMode === 'separate';

  // School picker state for separate mode
  const [schoolPicker, setSchoolPicker] = useState<{ action: 'print' | 'xml' | 'excel' | 'send' } | null>(null);
  const [selectedSchoolId, setSelectedSchoolId] = useState<string>('main');

  const getSchoolName = (sid: string) => {
    if (sid === 'main') return schoolInfo.schoolName || 'المدرسة الرئيسية';
    return schoolInfo.sharedSchools?.find(s => s.id === sid)?.name || sid;
  };

  const getTimetableForSchool = (sid: string): TimetableData => {
    const schoolClassIds = new Set(
      classes.filter(c => c.schoolId === sid || (!c.schoolId && sid === 'main')).map(c => c.id)
    );
    return Object.fromEntries(
      Object.entries(timetable).filter(([, slot]: any) => schoolClassIds.has(slot.classId))
    ) as TimetableData;
  };

  // Print functionality
  const handlePrint = () => {
    if (isSeparateMode) { setSchoolPicker({ action: 'print' }); return; }
    setShowPrintModal(true);
  };

  // Send functionality (email)
  const handleSend = () => {
    if (isSeparateMode) { setSchoolPicker({ action: 'send' }); return; }
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
    if (isSeparateMode) { setSchoolPicker({ action: 'xml' }); return; }
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
    if (isSeparateMode) { setSchoolPicker({ action: 'excel' }); return; }
    setIsGenerating(true);
    try {
      const csvContent = generateCSVContent(timetable);
      downloadFile(csvContent, `schedule-${schoolInfo.schoolName}-${new Date().toISOString().split('T')[0]}.csv`, 'text/csv');
    } catch (error) {
      console.error('Error generating Excel:', error);
      alert('حدث خطأ أثناء تصدير الملف Excel');
    } finally {
      setIsGenerating(false);
    }
  };

  const generateCSVContent = (tt: TimetableData) => {
    const headers = ['المعلم', 'المادة', 'الفصل', 'اليوم', 'الحصة'];
    const rows = Object.entries(tt).map(([key, slot]) => {
      const parts = key.split('-');
      const teacherId = parts.slice(0, parts.length - 2).join('-');
      const day = parts[parts.length - 2];
      const period = parts[parts.length - 1];
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

  // Execute action after school selection in separate mode
  const executeSchoolAction = () => {
    if (!schoolPicker) return;
    const schoolTT = getTimetableForSchool(selectedSchoolId);
    const name = getSchoolName(selectedSchoolId);

    switch (schoolPicker.action) {
      case 'print':
        setSchoolPicker(null);
        setShowPrintModal(true);
        break;
      case 'xml':
        try {
          const xmlData = generateExtensionXML(schoolTT, teachers, subjects, classes, schoolInfo);
          downloadFile(xmlData, `schedule-${name}-${new Date().toISOString().split('T')[0]}.xml`, 'application/xml');
        } catch (e) { alert('حدث خطأ أثناء تصدير الملف XML'); }
        setSchoolPicker(null);
        break;
      case 'excel':
        try {
          const csv = generateCSVContent(schoolTT);
          downloadFile(csv, `schedule-${name}-${new Date().toISOString().split('T')[0]}.csv`, 'text/csv');
        } catch (e) { alert('حدث خطأ أثناء تصدير الملف Excel'); }
        setSchoolPicker(null);
        break;
      case 'send':
        setSchoolPicker(null);
        setShowSendModal(true);
        break;
    }
  };

  return (
    <div className="space-y-6 pb-20">

      {/* ══════ Header ══════ */}
      <div className="bg-white rounded-[2rem] p-8 shadow-sm border border-slate-100 relative group hover:shadow-md transition-all duration-300 overflow-hidden mb-6">
          <div className="absolute top-0 right-0 w-32 h-32 bg-[#e5e1fe] rounded-bl-[4rem] -z-0 transition-transform group-hover:scale-110 duration-500"></div>

          <h3 className="text-xl font-black text-slate-800 flex items-center gap-3 relative z-10">
            <Printer size={36} strokeWidth={1.8} className="text-[#655ac1]" />
            طباعة وتصدير الجدول
          </h3>
          <p className="text-slate-500 font-medium mt-2 mr-12 relative z-10">معاينة وطباعة وتصدير الجداول الدراسية عبر واجهة تفاعلية وسلسة</p>
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
          timetable: isSeparateMode ? getTimetableForSchool(selectedSchoolId) : timetable,
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
        schoolName={isSeparateMode ? getSchoolName(selectedSchoolId) : undefined}
      />

      {/* ══════ School Picker Modal (separate mode) ══════ */}
      {schoolPicker && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl flex flex-col animate-in zoom-in-95 overflow-hidden">
            <div className="p-6 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <School size={24} className="text-[#655ac1] shrink-0" />
                <div>
                  <h3 className="font-black text-slate-800 text-lg">اختر المدرسة</h3>
                  <p className="text-sm font-medium text-slate-500">
                    {schoolPicker.action === 'print' && 'معاينة وطباعة جدول المدرسة'}
                    {schoolPicker.action === 'xml' && 'تصدير XML لجدول المدرسة'}
                    {schoolPicker.action === 'excel' && 'تصدير Excel لجدول المدرسة'}
                    {schoolPicker.action === 'send' && 'إرسال جدول المدرسة'}
                  </p>
                </div>
              </div>
              <button onClick={() => setSchoolPicker(null)} className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-colors">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-3">
              {['main', ...(schoolInfo.sharedSchools || []).map(s => s.id)].map(sid => (
                <button
                  key={sid}
                  onClick={() => setSelectedSchoolId(sid)}
                  className={`w-full flex items-center gap-3 px-5 py-4 rounded-xl border-2 font-bold text-sm transition-all ${
                    selectedSchoolId === sid
                      ? 'border-[#655ac1] bg-white text-[#655ac1]'
                      : 'border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300'
                  }`}
                >
                  {selectedSchoolId === sid
                    ? <Check size={18} className="text-[#655ac1] shrink-0" />
                    : <div className="w-[18px] h-[18px] rounded-full border-2 border-slate-300 shrink-0" />
                  }
                  {getSchoolName(sid)}
                </button>
              ))}
            </div>
            <div className="p-5 bg-slate-50 border-t border-slate-100 flex gap-3 justify-end">
              <button
                onClick={() => setSchoolPicker(null)}
                className="px-5 py-2.5 rounded-xl font-bold text-slate-600 bg-white border border-slate-200 hover:bg-slate-100 transition-all"
              >
                إلغاء
              </button>
              <button
                onClick={executeSchoolAction}
                className="px-6 py-2.5 bg-[#655ac1] hover:bg-[#5046a0] text-white rounded-xl font-bold shadow-lg shadow-[#655ac1]/20 transition-all"
              >
                {schoolPicker.action === 'print' && 'معاينة وطباعة'}
                {schoolPicker.action === 'xml' && 'تصدير XML'}
                {schoolPicker.action === 'excel' && 'تصدير Excel'}
                {schoolPicker.action === 'send' && 'إرسال'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ScheduleReports;
