import React, { useState, useMemo, useCallback, useRef } from 'react';
import { ClassInfo, Student, SchoolInfo, Phase } from '../../../types';
import { PHASE_CONFIG } from '../../../constants';
import {
  Users, Upload, Search, Filter, Printer, Trash2, Plus, X, Pencil, Check,
  AlertTriangle, School, GraduationCap, ArrowUpCircle, Download,
  ChevronDown, Loader2, CheckCircle2, Phone, Hash, FileSpreadsheet,
  RotateCcw, UserPlus, Trash
} from 'lucide-react';
import {
  parseStudentExcel,
  printStudentList,
  filterStudents,
  getStudentStats,
} from '../../../utils/studentUtils';
import SchoolTabs from '../SchoolTabs';

interface Step5Props {
  classes: ClassInfo[];
  students: Student[];
  setStudents: React.Dispatch<React.SetStateAction<Student[]>>;
  schoolInfo: SchoolInfo;
}

const Step5Students: React.FC<Step5Props> = ({ classes, students, setStudents, schoolInfo }) => {
  // ─── Core State ───
  const [activeSchoolId, setActiveSchoolId] = useState<string>('main');
  const [activePhase, setActivePhase] = useState<Phase>(schoolInfo.phases?.[0] || Phase.ELEMENTARY);

  // ─── Import State ───
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importResult, setImportResult] = useState<{ matched: number; unmatched: number; total: number; errors: string[] } | null>(null);
  const [showImportErrors, setShowImportErrors] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ─── Manual Add/Edit State ───
  const [showAddForm, setShowAddForm] = useState(false);
  const [addName, setAddName] = useState('');
  const [addGrade, setAddGrade] = useState<number>(1);
  const [addClassId, setAddClassId] = useState('');
  const [addPhone, setAddPhone] = useState('');
  const [editingStudent, setEditingStudent] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editClassId, setEditClassId] = useState('');

  // ─── Filter State ───
  const [searchText, setSearchText] = useState('');
  const [filterGrade, setFilterGrade] = useState<number | ''>('');
  const [filterClassId, setFilterClassId] = useState('');
  const [selectedGrade, setSelectedGrade] = useState<number | null>(null); // For drill-down navigation

  // ─── Selection State ───
  const [selectedStudents, setSelectedStudents] = useState<Set<string>>(new Set());
  const [showDeleteAllConfirm, setShowDeleteAllConfirm] = useState(false);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
  const [showMissingDataOnly, setShowMissingDataOnly] = useState(false); // Filter for missing data


  // ─── Print State ───
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [showPrintMenu, setShowPrintMenu] = useState(false);
  const [showBulkCountModal, setShowBulkCountModal] = useState(false);

  // ─── Manual Bulk Entry State ───
  const [isBulkEntryMode, setIsBulkEntryMode] = useState(false);
  const [bulkCount, setBulkCount] = useState<number>(50);
  const [bulkStudents, setBulkStudents] = useState<Array<{
    id: string;
    name: string;
    grade: number;
    classId: string;
    parentPhone: string;
  }>>([]);

  // ─── Toast State ───
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  // ─── Derived Data ───
  // Sync activePhase with activeSchoolId
  React.useEffect(() => {
    if (activeSchoolId === 'main') {
      const phases = schoolInfo.phases || [];
      if (phases.length > 0 && !phases.includes(activePhase)) {
        setActivePhase(phases[0]);
      }
    } else {
      const shared = schoolInfo.sharedSchools?.find(s => s.id === activeSchoolId);
      if (shared && shared.phases?.length > 0) {
        if (!shared.phases.includes(activePhase)) {
          setActivePhase(shared.phases[0]);
        }
      }
    }
  }, [activeSchoolId, schoolInfo, activePhase]);

  const hasSecond = schoolInfo.hasSecondSchool && (schoolInfo.secondSchoolPhases || [])[0];
  const totalGrades = PHASE_CONFIG[activePhase]?.grades || 6;

  const schoolStudents = useMemo(() => {
    return students.filter(s => (s.schoolId || 'main') === activeSchoolId);
  }, [students, activeSchoolId]);

  const schoolClasses = useMemo(() => {
    return classes.filter(c =>
      c.phase === activePhase && (c.schoolId || 'main') === activeSchoolId
    ).sort((a, b) => {
      if (a.grade !== b.grade) return a.grade - b.grade;
      return a.section - b.section;
    });
  }, [classes, activePhase, activeSchoolId]);

  const studentsWithMissingData = useMemo(() => {
    return schoolStudents.filter(s => !s.grade || !s.classId || !s.parentPhone);
  }, [schoolStudents]);

  const filteredStudents = useMemo(() => {
    let result = schoolStudents;

    if (showMissingDataOnly) {
      result = studentsWithMissingData;
    } else {
      result = filterStudents(result, {
        searchText: searchText || undefined,
        grade: filterGrade || undefined,
        classId: filterClassId || undefined,
      });
    }

    return result.sort((a, b) => {
      if (a.grade !== b.grade) return a.grade - b.grade;
      return a.name.localeCompare(b.name, 'ar');
    });
  }, [schoolStudents, searchText, filterGrade, filterClassId, showMissingDataOnly, studentsWithMissingData]);

  const stats = useMemo(() => getStudentStats(schoolStudents, schoolClasses), [schoolStudents, schoolClasses]);

  const classesForGrade = useMemo(() => {
    return schoolClasses.filter(c => c.grade === addGrade);
  }, [schoolClasses, addGrade]);

  // ─── Toast Helper ───
  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  }, []);

  // ─── Excel Import ───
  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    setImportProgress(0);
    setImportResult(null);

    // Simulate progress for UX
    const progressInterval = setInterval(() => {
      setImportProgress(prev => {
        if (prev >= 90) { clearInterval(progressInterval); return 90; }
        return prev + Math.random() * 15;
      });
    }, 200);

    try {
      const result = await parseStudentExcel(file, classes, activeSchoolId, activePhase);

      clearInterval(progressInterval);
      setImportProgress(100);

      // Add parsed students (merge with existing)
      setStudents(prev => {
        const otherSchool = prev.filter(s => (s.schoolId || 'main') !== activeSchoolId);
        return [...otherSchool, ...result.students];
      });

      setImportResult({
        matched: result.matched,
        unmatched: result.unmatched,
        total: result.students.length,
        errors: result.errors,
      });

      showToast(`تم تحميل ${result.students.length} طالب بنجاح`, 'success');

      setTimeout(() => {
        setIsImporting(false);
        setImportProgress(0);
      }, 1500);
    } catch (err) {
      clearInterval(progressInterval);
      setIsImporting(false);
      setImportProgress(0);
      showToast('حدث خطأ أثناء قراءة الملف', 'error');
    }

    // Reset file input
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, [classes, activeSchoolId, activePhase, setStudents, showToast]);

  // ─── Manual Add ───
  const handleAddStudent = useCallback(() => {
    if (!addName.trim()) return;

    const student: Student = {
      id: `student-${activeSchoolId}-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      name: addName.trim(),
      classId: addClassId || '',
      grade: addGrade,
      parentPhone: addPhone.trim() || undefined,
      schoolId: activeSchoolId,
    };

    setStudents(prev => [...prev, student]);
    setAddName('');
    setAddPhone('');
    setAddClassId('');
    showToast('تم إضافة الطالب بنجاح');
  }, [addName, addGrade, addClassId, addPhone, activeSchoolId, setStudents, showToast]);

  // ─── Edit ───
  const handleStartEdit = useCallback((s: Student) => {
    setEditingStudent(s.id);
    setEditName(s.name);
    setEditPhone(s.parentPhone || '');
    setEditClassId(s.classId);
  }, []);

  const handleSaveEdit = useCallback(() => {
    if (!editingStudent) return;
    setStudents(prev => prev.map(s =>
      s.id === editingStudent ? {
        ...s,
        name: editName.trim() || s.name,
        parentPhone: editPhone.trim() || undefined,
        classId: editClassId,
      } : s
    ));
    setEditingStudent(null);
    showToast('تم تحديث البيانات');
  }, [editingStudent, editName, editPhone, editClassId, setStudents, showToast]);

  // ─── Delete ───
  const handleDeleteOne = useCallback((id: string) => {
    setStudents(prev => prev.filter(s => s.id !== id));
    setSelectedStudents(prev => { const ns = new Set(prev); ns.delete(id); return ns; });
  }, [setStudents]);

  const handleBulkDelete = useCallback(() => {
    setStudents(prev => prev.filter(s => !selectedStudents.has(s.id)));
    setSelectedStudents(new Set());
    setShowBulkDeleteConfirm(false);
    showToast(`تم حذف ${selectedStudents.size} طالب`);
  }, [selectedStudents, setStudents, showToast]);

  const handleDeleteAll = useCallback(() => {
    setStudents(prev => prev.filter(s => (s.schoolId || 'main') !== activeSchoolId));
    setSelectedStudents(new Set());
    setShowDeleteAllConfirm(false);
    showToast('تم حذف جميع الطلاب');
  }, [activeSchoolId, setStudents, showToast]);

  // ─── Selection ───
  const toggleSelect = useCallback((id: string) => {
    setSelectedStudents(prev => {
      const ns = new Set(prev);
      if (ns.has(id)) ns.delete(id); else ns.add(id);
      return ns;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    const ids = filteredStudents.map(s => s.id);
    const allSelected = ids.every(id => selectedStudents.has(id));
    setSelectedStudents(prev => {
      const ns = new Set(prev);
      ids.forEach(id => { if (allSelected) ns.delete(id); else ns.add(id); });
      return ns;
    });
  }, [filteredStudents, selectedStudents]);

  // ─── Promotion Removed ───

  // ─── Print ───
  const handlePrint = useCallback((sortBy: 'grade' | 'class', specificClassId?: string) => {
    let listToPrint = schoolStudents;
    let title = '';

    if (specificClassId) {
      listToPrint = schoolStudents.filter(s => s.classId === specificClassId);
      title = `قائمة طلاب ${getClassName(specificClassId)}`;
    } else if (filterClassId) {
       listToPrint = filteredStudents;
       title = `قائمة طلاب ${getClassName(filterClassId)}`;
    }

    printStudentList(listToPrint, schoolClasses, schoolInfo, sortBy, title);
    setShowPrintMenu(false);
  }, [schoolStudents, filteredStudents, schoolClasses, schoolInfo, filterClassId]);

  // Helper: get class display name
  const getClassName = (classId: string) => {
    const cls = classes.find(c => c.id === classId);
    if (!cls) return 'غير محدد';
    return cls.name || `${cls.grade}/${cls.section}`;
  };

  // ══════════════════════════════════════════════════════
  //   R E N D E R
  // ══════════════════════════════════════════════════════

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">

      {/* ══════ Toast Notification ══════ */}
      {toast && (
        <div className={`fixed top-6 left-1/2 -translate-x-1/2 z-[100] px-8 py-4 rounded-2xl shadow-2xl font-bold text-sm flex items-center gap-3 animate-in slide-in-from-top-4 duration-300 ${
          toast.type === 'success' ? 'bg-emerald-500 text-white' :
          toast.type === 'error' ? 'bg-rose-500 text-white' :
          'bg-indigo-500 text-white'
        }`}>
          {toast.type === 'success' && <CheckCircle2 size={20} />}
          {toast.type === 'error' && <AlertTriangle size={20} />}
          {toast.type === 'info' && <ArrowUpCircle size={20} />}
          {toast.message}
        </div>
      )}

      {/* ══════ Header ══════ */}
      <div className="bg-white rounded-[2rem] p-8 shadow-sm border border-slate-100 relative group hover:shadow-md transition-all duration-300 overflow-hidden mb-6">
          <div className="absolute top-0 right-0 w-32 h-32 bg-[#e5e1fe] rounded-bl-[4rem] -z-0 transition-transform group-hover:scale-110 duration-500"></div>
          
          <h3 className="text-xl font-black text-slate-800 flex items-center gap-3 relative z-10">
            <GraduationCap size={36} strokeWidth={1.8} className="text-[#655ac1]" />
             إدارة الطلاب
          </h3>
          <p className="text-slate-500 font-medium mt-2 mr-12 relative z-10">استيراد الطلاب أو إضافتهم يدويًا وإدارة بياناتهم.</p>
      </div>

       {/* ══════ School Tabs ══════ */}
       <div className="mb-6">
        <SchoolTabs
            schoolInfo={schoolInfo}
            activeSchoolId={activeSchoolId}
            onTabChange={(id) => {
            setActiveSchoolId(id);
            setSelectedStudents(new Set());
            }}
        />
      </div>

      {/* Phase Selector (if multi-phase) */}
      {(() => {
        const currentPhases = activeSchoolId === 'main' 
          ? schoolInfo.phases || [] 
          : (schoolInfo.sharedSchools?.find(s => s.id === activeSchoolId)?.phases || []);
        
        if (currentPhases.length <= 1) return null;

        return (
          <div className="flex flex-wrap gap-2 mb-6 p-1 bg-white rounded-xl border border-slate-200 shadow-sm animate-in fade-in slide-in-from-top-2">
            {currentPhases.map(p => (
              <button
                key={p}
                onClick={() => setActivePhase(p)}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                  activePhase === p
                    ? 'bg-primary text-white shadow-md'
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
                }`}
              >
                {p === Phase.OTHER && (activeSchoolId === 'main' ? schoolInfo.otherPhase : schoolInfo.sharedSchools?.find(s => s.id === activeSchoolId)?.otherPhase) 
                  ? (activeSchoolId === 'main' ? schoolInfo.otherPhase : schoolInfo.sharedSchools?.find(s => s.id === activeSchoolId)?.otherPhase) 
                  : p}
              </button>
            ))}
          </div>
        );
      })()}

      {/* ══════ Manual Bulk Entry Mode ══════ */}
      {isBulkEntryMode && (() => {
        const availableGrades = [...new Set(schoolClasses.map(c => c.grade))].sort((a, b) => a - b);
        const defaultGrade = availableGrades[0] ?? 1;
        return (
          <div className="bg-white rounded-[2rem] border border-slate-100 shadow-xl overflow-hidden animate-in slide-in-from-bottom-4 duration-500">
              <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                  <h3 className="font-black text-lg text-slate-800 flex items-center gap-2">
                      <Pencil size={20} className="text-[#655ac1]" /> إضافة الطلاب يدويًا
                  </h3>
                  <div className="flex items-center gap-2">
                      <button
                          onClick={() => {
                             const validStudents = bulkStudents.filter(s => s.name.trim().length > 0);
                             if (validStudents.length === 0) {
                                 showToast('لا يوجد طلاب للحفظ', 'error');
                                 return;
                             }
                             const newStudents: Student[] = validStudents.map(s => ({
                                 id: s.id,
                                 name: s.name,
                                 grade: s.grade,
                                 classId: s.classId,
                                 parentPhone: s.parentPhone || undefined,
                                 schoolId: activeSchoolId
                             }));
                             setStudents(prev => [...prev, ...newStudents]);
                             setIsBulkEntryMode(false);
                             setBulkStudents([]);
                             showToast(`تم إضافة ${newStudents.length} طالب بنجاح`, 'success');
                          }}
                          className="px-6 py-2 bg-emerald-500 text-white rounded-xl text-sm font-bold hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-200"
                      >
                          <CheckCircle2 size={16} className="inline ml-2" /> حفظ الطلاب ({bulkStudents.filter(s => s.name.trim()).length})
                      </button>
                      <button
                          onClick={() => setIsBulkEntryMode(false)}
                          className="px-6 py-2 bg-white text-slate-500 border border-slate-200 rounded-xl text-sm font-bold hover:bg-slate-50 transition-all"
                      >
                          إلغاء
                      </button>
                  </div>
              </div>

               {/* Batch Assignment Controls */}
               <div className="p-4 bg-[#f5f3ff] border-b border-[#e5e1fe] flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-2 shrink-0">
                      <div className="w-7 h-7 bg-[#655ac1] rounded-lg flex items-center justify-center">
                          <Users size={14} className="text-white" />
                      </div>
                      <span className="text-sm font-black text-[#655ac1]">تعيين الصف والفصل لجميع الطلاب دفعة واحدة</span>
                  </div>
                  <div className="w-px h-6 bg-[#e5e1fe]"></div>
                  <select
                      className="px-4 py-2 bg-white border border-[#e5e1fe] rounded-xl text-sm font-bold text-slate-600 focus:border-[#655ac1] outline-none shadow-sm"
                      defaultValue=""
                      onChange={(e) => {
                          if (e.target.value) {
                              const grade = parseInt(e.target.value);
                              setBulkStudents(prev => prev.map(s => ({ ...s, grade, classId: '' })));
                          }
                      }}
                  >
                      <option value="">اختر الصف للجميع...</option>
                      {availableGrades.map(g => (
                          <option key={g} value={g}>الصف {g}</option>
                      ))}
                  </select>

                  <select
                       className="px-4 py-2 bg-white border border-[#e5e1fe] rounded-xl text-sm font-bold text-slate-600 focus:border-[#655ac1] outline-none shadow-sm"
                       defaultValue=""
                       onChange={(e) => {
                          if (e.target.value) {
                              const classId = e.target.value;
                              const cls = schoolClasses.find(c => c.id === classId);
                              if (cls) {
                                  setBulkStudents(prev => prev.map(s => ({ ...s, classId, grade: cls.grade })));
                              }
                          }
                       }}
                  >
                      <option value="">اختر الفصل للجميع...</option>
                      {availableGrades.map(g => {
                          const gradeClasses = schoolClasses.filter(c => c.grade === g);
                          if (gradeClasses.length === 0) return null;
                          return (
                              <optgroup key={g} label={`الصف ${g}`}>
                                  {gradeClasses.map(c => (
                                      <option key={c.id} value={c.id}>{c.name || `${c.grade}/${c.section}`}</option>
                                  ))}
                              </optgroup>
                          );
                      })}
                  </select>
               </div>

              <div className="p-0 custom-scrollbar">
                  <table className="w-full">
                      <thead className="sticky top-0 z-10 bg-white shadow-sm">
                          <tr className="bg-slate-50 border-b border-slate-200 text-slate-500">
                              <th className="p-4 text-center w-16">#</th>
                              <th className="p-4 text-right min-w-[200px]">اسم الطالب <span className="text-rose-500">*</span></th>
                              <th className="p-4 text-center w-40">الصف <span className="text-rose-500">*</span></th>
                              <th className="p-4 text-center w-48">الفصل</th>
                              <th className="p-4 text-center w-48">رقم ولي الأمر</th>
                              <th className="p-4 text-center w-16"></th>
                          </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                          {bulkStudents.map((student, index) => (
                              <tr key={student.id} className="group hover:bg-indigo-50/10 transition-colors">
                                  <td className="p-3 text-center text-slate-400 font-bold text-xs">{index + 1}</td>
                                  <td className="p-3">
                                      <input
                                          type="text"
                                          placeholder="اسم الطالب رباعي"
                                          value={student.name}
                                          onChange={(e) => {
                                              const updated = bulkStudents.map((s, i) => i === index ? { ...s, name: e.target.value } : s);
                                              setBulkStudents(updated);
                                          }}
                                          className={`w-full p-3 bg-slate-50 border-2 rounded-xl outline-none text-sm font-bold transition-all focus:bg-white ${
                                              student.name.trim() ? 'border-transparent focus:border-[#655ac1]' : 'border-slate-200 focus:border-rose-400'
                                          }`}
                                      />
                                  </td>
                                  <td className="p-3">
                                      <select
                                          value={student.grade}
                                          onChange={(e) => {
                                              const grade = parseInt(e.target.value);
                                              const updated = bulkStudents.map((s, i) => i === index ? { ...s, grade, classId: '' } : s);
                                              setBulkStudents(updated);
                                          }}
                                          className="w-full p-3 bg-white border border-slate-200 rounded-xl outline-none text-sm font-bold text-slate-600 focus:border-[#655ac1]"
                                      >
                                          {availableGrades.length > 0 ? availableGrades.map(g => (
                                              <option key={g} value={g}>الصف {g}</option>
                                          )) : (
                                              <option value="1">الصف 1</option>
                                          )}
                                      </select>
                                  </td>
                                  <td className="p-3">
                                      <select
                                          value={student.classId}
                                          onChange={(e) => {
                                              const updated = bulkStudents.map((s, i) => i === index ? { ...s, classId: e.target.value } : s);
                                              setBulkStudents(updated);
                                          }}
                                          className="w-full p-3 bg-white border border-slate-200 rounded-xl outline-none text-sm font-bold text-slate-600 focus:border-[#655ac1]"
                                      >
                                          <option value="">اختر الفصل</option>
                                          {schoolClasses.filter(c => c.grade === student.grade).map(c => (
                                              <option key={c.id} value={c.id}>{c.name || `${c.grade}/${c.section}`}</option>
                                          ))}
                                      </select>
                                  </td>
                                  <td className="p-3">
                                      <input
                                          type="tel"
                                          dir="ltr"
                                          placeholder="05xxxxxxxx"
                                          value={student.parentPhone}
                                          onChange={(e) => {
                                              const updated = bulkStudents.map((s, i) => i === index ? { ...s, parentPhone: e.target.value } : s);
                                              setBulkStudents(updated);
                                          }}
                                          className="w-full p-3 bg-slate-50 border border-transparent rounded-xl outline-none text-sm font-bold text-center group-hover:bg-white group-hover:border-slate-200 focus:!border-[#655ac1] focus:!bg-white transition-all"
                                      />
                                  </td>
                                   <td className="p-3 text-center">
                                      <button
                                          onClick={() => setBulkStudents(prev => prev.filter((_, i) => i !== index))}
                                          className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all"
                                      >
                                          <X size={16} />
                                      </button>
                                   </td>
                              </tr>
                          ))}
                      </tbody>
                  </table>

                  {/* Add Row Button */}
                   <div className="p-4 border-t border-slate-100 bg-slate-50/30 text-center">
                      <button
                          onClick={() => {
                               const lastRow = bulkStudents[bulkStudents.length - 1];
                               setBulkStudents(prev => [...prev, {
                                  id: `student-bulk-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
                                  name: '',
                                  grade: lastRow ? lastRow.grade : defaultGrade,
                                  classId: lastRow ? lastRow.classId : '',
                                  parentPhone: ''
                               }]);
                          }}
                          className="px-4 py-2 bg-white border border-dashed border-slate-300 rounded-xl text-slate-500 text-xs font-bold hover:border-[#655ac1] hover:text-[#655ac1] transition-all"
                      >
                          + إضافة سطر جديد
                      </button>
                   </div>
              </div>
          </div>
        );
      })()}

      {/* ══════ Action Bar + Content ══════ */}
      {!isBulkEntryMode && (
        <>
            {/* ══════ Action Bar ══════ */}
            <div className="flex flex-wrap items-center gap-3 mb-6 bg-white/60 backdrop-blur-md rounded-2xl py-3.5 px-4 shadow-sm border border-slate-200">
                {/* Import Button */}
                <button
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-2 px-5 py-2.5 bg-[#655ac1] text-white rounded-xl font-bold shadow-md shadow-[#655ac1]/20 hover:bg-[#5448a8] transition-all hover:scale-105 active:scale-95"
                >
                    <Upload size={18} />
                    استيراد من Excel
                </button>

                {/* Add Student Button */}
                <button
                    onClick={() => setShowAddForm(true)}
                    className="flex items-center gap-2 px-5 py-2.5 bg-white text-slate-700 border border-slate-200 rounded-xl font-bold hover:border-[#8779fb] hover:text-[#655ac1] transition-all hover:scale-105 active:scale-95"
                >
                    <Plus size={18} className="text-[#8779fb]" />
                    إضافة طالب
                </button>

                {/* Add Multiple Students Button */}
                <button
                    onClick={() => setShowBulkCountModal(true)}
                    className="flex items-center gap-2 px-5 py-2.5 bg-white text-slate-700 border border-slate-200 rounded-xl font-bold hover:border-[#9d8fe8] hover:text-[#655ac1] transition-all hover:scale-105 active:scale-95"
                >
                    <Users size={18} className="text-[#9d8fe8]" />
                    إضافة عدة طلاب
                </button>

                <div className="flex-1"></div>

                {/* Print Button */}
                <button
                    onClick={() => setShowPrintModal(true)}
                    className="flex items-center gap-2 px-5 py-2.5 bg-white text-slate-600 border border-slate-200 rounded-xl font-bold hover:border-[#655ac1] transition-all hover:scale-105 active:scale-95"
                >
                    <Printer size={18} className="text-[#655ac1]" />
                    طباعة
                </button>

                {/* Print Options Modal */}
                {showPrintModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                        <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
                            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                                <h3 className="font-black text-lg text-slate-800 flex items-center gap-2">
                                    <Printer size={20} className="text-[#655ac1]" /> خيارات الطباعة
                                </h3>
                                <button onClick={() => setShowPrintModal(false)} className="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-all">
                                    <X size={20} />
                                </button>
                            </div>
                            <div className="p-6 space-y-3">
                                <button
                                    onClick={() => { handlePrint('grade'); setShowPrintModal(false); }}
                                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl hover:border-[#655ac1] hover:bg-[#e5e1fe]/20 transition-all flex items-center gap-4 group text-right"
                                >
                                    <div className="p-3 bg-white rounded-xl shadow-sm border border-slate-100 group-hover:border-[#e5e1fe]">
                                        <GraduationCap size={24} className="text-slate-400 group-hover:text-[#655ac1]" />
                                    </div>
                                    <div>
                                        <div className="font-black text-slate-700 group-hover:text-[#655ac1]">طباعة الكل (حسب الصف)</div>
                                        <div className="text-xs text-slate-400 font-bold mt-1">يتم طباعة جميع الطلاب مرتبين حسب الصفوف</div>
                                    </div>
                                </button>
                                <div className="relative">
                                    <div className="absolute inset-x-0 top-1/2 border-t border-slate-100"></div>
                                    <div className="relative flex justify-center">
                                        <span className="bg-white px-2 text-xs font-bold text-slate-300">أو تحديد مخصص</span>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-500 mr-1">طباعة حسب الصف:</label>
                                    <select
                                        onChange={(e) => {
                                            if (e.target.value) {
                                                const grade = parseInt(e.target.value);
                                                const gradeStudents = schoolStudents.filter(s => s.grade === grade);
                                                printStudentList(gradeStudents, schoolClasses, schoolInfo, 'class', `قائمة طلاب الصف ${grade}`);
                                                setShowPrintModal(false);
                                            }
                                        }}
                                        className="w-full p-3 bg-white border border-slate-200 rounded-xl outline-none text-sm font-bold text-slate-600 focus:border-[#655ac1] focus:ring-4 focus:ring-[#e5e1fe] transition-all"
                                    >
                                        <option value="">اختر صفاً للطباعة...</option>
                                        {Array.from({ length: totalGrades }, (_, i) => i + 1).map(grade => (
                                            <option key={grade} value={grade}>الصف {grade}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-500 mr-1">طباعة فصل محدد:</label>
                                    <select
                                        onChange={(e) => {
                                            if (e.target.value) {
                                                handlePrint('class', e.target.value);
                                                setShowPrintModal(false);
                                            }
                                        }}
                                        className="w-full p-3 bg-white border border-slate-200 rounded-xl outline-none text-sm font-bold text-slate-600 focus:border-[#655ac1] focus:ring-4 focus:ring-[#e5e1fe] transition-all"
                                    >
                                        <option value="">اختر فصلاً للطباعة...</option>
                                        {schoolClasses.map(c => (
                                            <option key={c.id} value={c.id}>{c.name || `${c.grade}/${c.section}`}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            <div className="bg-slate-50 p-4 text-center">
                                <button onClick={() => setShowPrintModal(false)} className="text-xs font-bold text-slate-400 hover:text-slate-600">
                                    إلغاء
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Delete All Button */}
                <button
                    onClick={() => setShowDeleteAllConfirm(true)}
                    className="flex items-center gap-2 px-5 py-2.5 bg-white text-rose-500 border border-slate-200 rounded-xl font-bold hover:border-[#655ac1] transition-all hover:scale-105 active:scale-95"
                >
                    <Trash2 size={18} className="text-rose-500" />
                    حذف الكل
                </button>
            </div>



            {/* ══════ Stats Cards (Drill-Down) ══════ */}
            {schoolStudents.length > 0 && <div className="space-y-3">
            {selectedGrade && (
                <button
                onClick={() => { setSelectedGrade(null); setFilterGrade(''); setFilterClassId(''); }}
                className="flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-[#655ac1] transition-all pr-1"
                >
                <ArrowUpCircle size={14} className="rotate-90" /> عودة لجميع الصفوف
                </button>
            )}
            
            <div className={`grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 ${selectedGrade ? 'animate-in slide-in-from-right-4 duration-300' : ''}`}>
                {!selectedGrade ? (
                // Level 1: Grades
                Array.from({ length: totalGrades }, (_, i) => i + 1).map(grade => {
                    const count = stats.gradeMap.get(grade) || 0;
                    return (
                    <div
                        key={grade}
                        onClick={() => { setSelectedGrade(grade); setFilterGrade(grade); setFilterClassId(''); }}
                        className="p-4 rounded-xl border-2 border-slate-100 bg-white hover:border-[#8779fb]/30 hover:shadow-md transition-all cursor-pointer text-center group flex flex-col justify-between h-28"
                    >
                         <div className="text-xs font-bold text-slate-500 group-hover:text-[#655ac1] mb-2">الصف {grade}</div>
                        <div className="text-3xl font-black text-[#655ac1] group-hover:scale-110 transition-transform">{count}</div>
                    </div>
                    );
                })
                ) : (
                // Level 2: Classes for Selected Grade
                schoolClasses.filter(c => c.grade === selectedGrade).map(cls => {
                    const count = stats.classMap.get(cls.id) || 0;
                    const isSelected = filterClassId === cls.id;
                    return (
                    <div
                        key={cls.id}
                        onClick={() => setFilterClassId(isSelected ? '' : cls.id)}
                        className={`p-4 rounded-xl border-2 transition-all cursor-pointer text-center group flex flex-col justify-between h-28 ${
                        isSelected
                            ? 'border-[#655ac1] bg-[#e5e1fe]/20 shadow-md'
                            : 'border-slate-100 bg-white hover:border-[#8779fb]/30 hover:shadow-md'
                        }`}
                    >
                        <div className={`text-xs font-bold mb-2 ${isSelected ? 'text-[#655ac1]' : 'text-slate-500'}`}>
                        {cls.name || `${cls.grade}/${cls.section}`}
                        </div>
                        <div className={`text-3xl font-black transition-transform group-hover:scale-110 ${isSelected ? 'text-[#655ac1]' : 'text-slate-600'}`}>
                        {count}
                        </div>
                    </div>
                    );
                })
                )}
                
                {/* Show "No Classes" state if in grade view but no classes exist */}
                {selectedGrade && schoolClasses.filter(c => c.grade === selectedGrade).length === 0 && (
                <div className="col-span-full p-6 text-center text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                    <p className="text-xs font-bold">لا توجد فصول مضافة لهذا الصف بعد.</p>
                </div>
                )}
            </div>
            </div>}

          {/* ══════ Empty State ══════ */}
          {schoolStudents.length === 0 && !isImporting && (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <GraduationCap size={48} className="mx-auto mb-5" style={{ color: '#8779fb' }} strokeWidth={1.6} />
              <p className="text-slate-600 font-black text-lg mb-1">لا يوجد طلاب بعد</p>
              <p className="text-slate-400 text-sm">استخدم زر <span className="font-bold" style={{ color: '#655ac1' }}>استيراد من Excel</span> أو <span className="font-bold" style={{ color: '#655ac1' }}>إضافة عدة طلاب</span> للبدء</p>
            </div>
          )}

          {/* ══════ Import Loading Overlay ══════ */}
          {isImporting && (
            <div className="flex flex-col items-center justify-center py-16 space-y-6 animate-in fade-in duration-300">
              <div className="relative w-20 h-20">
                <div className="absolute inset-0 rounded-full border-4 border-slate-100"></div>
                <div className="absolute inset-0 rounded-full border-4 border-primary border-t-transparent animate-spin"></div>
                <div className="absolute inset-3 bg-primary/10 rounded-full flex items-center justify-center">
                  <FileSpreadsheet size={24} className="text-primary" />
                </div>
              </div>
              <div className="text-center">
                <h4 className="font-black text-slate-700 mb-1">جاري تحميل البيانات...</h4>
                <p className="text-sm text-slate-400">يتم قراءة ملف Excel ومطابقة الطلاب بالفصول</p>
              </div>
              <div className="w-full max-w-md">
                <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-l from-primary to-indigo-400 rounded-full transition-all duration-500 ease-out"
                    style={{ width: `${Math.min(importProgress, 100)}%` }}
                  />
                </div>
                <p className="text-xs text-center text-slate-400 mt-2 font-bold">{Math.round(importProgress)}%</p>
              </div>
            </div>
          )}
        </>
      )}
      
      {/* Hidden Input for Header Button */}
      {!isImporting && (
         <input
         ref={fileInputRef}
         type="file"
         accept=".xlsx,.xls,.csv"
         onChange={handleFileSelect}
         className="hidden"
       />
      )}

      {/* ─── Import Results Toast/Dialog ─── */}
      {importResult && !isImporting && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
             <div className="bg-white rounded-3xl p-6 w-full max-w-lg shadow-2xl scale-100 animate-in zoom-in-95 duration-200">
               <div className="flex items-center justify-between mb-6">
                    <h3 className="font-black text-lg text-slate-800 flex items-center gap-2">
                      <CheckCircle2 size={24} className="text-emerald-500" /> نتائج الاستيراد
                    </h3>
                    <button onClick={() => setImportResult(null)} className="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-all">
                      <X size={20} />
                    </button>
               </div>
               
               <div className="grid grid-cols-3 gap-3 mb-6">
                    <div className="text-center p-4 bg-slate-50 rounded-2xl border border-slate-100">
                      <div className="text-2xl font-black text-primary">{importResult.total}</div>
                      <div className="text-xs text-slate-400 font-bold mt-1">إجمالي الطلاب</div>
                    </div>
                    <div className="text-center p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
                      <div className="text-2xl font-black text-emerald-500">{importResult.matched}</div>
                      <div className="text-xs text-emerald-600/70 font-bold mt-1">تمت المطابقة</div>
                    </div>
                    <div className="text-center p-4 bg-amber-50 rounded-2xl border border-amber-100">
                      <div className="text-2xl font-black text-amber-500">{importResult.unmatched}</div>
                      <div className="text-xs text-amber-600/70 font-bold mt-1">بيانات ناقصة</div>
                    </div>
                </div>

                {importResult.errors.length > 0 && (
                  <div className="bg-slate-50 rounded-2xl p-4 max-h-40 overflow-y-auto custom-scrollbar border border-slate-100">
                    <h4 className="text-xs font-bold text-slate-500 mb-2 flex items-center gap-1">
                      <AlertTriangle size={12} /> تنبيهات ({importResult.errors.length})
                    </h4>
                    <div className="space-y-1">
                      {importResult.errors.map((err, i) => (
                         <div key={i} className="text-[10px] text-amber-700 bg-amber-50 p-2 rounded border border-amber-100/50">{err}</div>
                      ))}
                    </div>
                  </div>
                )}
                
                <div className="mt-6 flex justify-end">
                  <button onClick={() => setImportResult(null)} className="px-6 py-2 bg-slate-800 text-white rounded-xl text-sm font-bold hover:bg-slate-700 transition-all">
                    إغلاق
                  </button>
                </div>
             </div>
          </div>
      )}

      {/* ══════ Manual Add Modal (Replaces Card) ══════ */}
      {showAddForm && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-200 p-4">
           <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-10 md:zoom-in-95 duration-300">
             <div className="p-6 border-b border-slate-100 flex justify-between items-center">
               <h3 className="font-black text-lg text-slate-800 flex items-center gap-2">
                 <UserPlus size={24} className="text-emerald-500" /> إضافة طالب جديد
               </h3>
               <button onClick={() => setShowAddForm(false)} className="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-all">
                 <X size={20} />
               </button>
             </div>
             
             <div className="p-8">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-2">اسم الطالب *</label>
                      <input
                        type="text"
                        placeholder="أدخل اسم الطالب رباعياً"
                        value={addName}
                        onChange={e => setAddName(e.target.value)}
                        className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm font-bold focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all"
                        autoFocus
                      />
                    </div>
                     <div>
                      <label className="block text-xs font-bold text-slate-500 mb-2">رقم ولي الأمر</label>
                      <input
                        type="tel"
                        placeholder="05xxxxxxxx"
                        value={addPhone}
                        onChange={e => setAddPhone(e.target.value)}
                        className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm font-bold focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all"
                        dir="ltr"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-2">الصف الدراسي *</label>
                      <select
                        value={addGrade}
                        onChange={e => { setAddGrade(parseInt(e.target.value)); setAddClassId(''); }}
                        className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm font-bold focus:border-primary transition-all"
                      >
                        {Array.from({ length: totalGrades }, (_, i) => (
                          <option key={i + 1} value={i + 1}>الصف {i + 1}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-2">الفصل</label>
                      <select
                        value={addClassId}
                        onChange={e => setAddClassId(e.target.value)}
                        className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm font-bold focus:border-primary transition-all"
                      >
                        <option value="">اختر الفصل</option>
                        {classesForGrade.map(c => (
                          <option key={c.id} value={c.id}>
                            {c.name || `${c.grade}/${c.section}`}
                          </option>
                        ))}
                      </select>
                    </div>
                 </div>
                 
                 <div className="mt-8 flex gap-3">
                    <button
                      onClick={() => { handleAddStudent(); setShowAddForm(false); }}
                      disabled={!addName.trim()}
                      className="flex-1 py-4 bg-emerald-500 text-white font-black text-sm rounded-xl hover:bg-emerald-600 shadow-lg shadow-emerald-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      <CheckCircle2 size={18} /> حفظ البيانات
                    </button>
                    <button
                      onClick={() => setShowAddForm(false)}
                      className="flex-1 py-4 bg-white text-slate-400 border border-slate-200 font-bold text-sm rounded-xl hover:bg-slate-50 transition-all"
                    >
                      إلغاء
                    </button>
                 </div>
             </div>
           </div>
        </div>
      )}

      {/* ══════ Bulk Count Modal ══════ */}
      {showBulkCountModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-200 p-4">
          <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h3 className="font-black text-lg text-slate-800 flex items-center gap-2">
                <Users size={20} className="text-[#9d8fe8]" /> إضافة عدة طلاب
              </h3>
              <button onClick={() => setShowBulkCountModal(false)} className="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-all">
                <X size={20} />
              </button>
            </div>
            <div className="p-6">
              <p className="text-sm text-slate-500 font-medium mb-5">حدد عدد الطلاب المتوقع إضافتهم وسيتم إنشاء جدول لتعبئة بياناتهم.</p>
              <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-100 mb-6">
                <span className="text-sm font-bold text-slate-500 shrink-0">عدد الطلاب:</span>
                <input
                  type="number"
                  min="1"
                  max="500"
                  value={bulkCount}
                  onChange={(e) => setBulkCount(parseInt(e.target.value) || 0)}
                  className="flex-1 p-2 bg-white border border-slate-200 rounded-xl font-bold text-center outline-none focus:border-[#9d8fe8] text-sm"
                  autoFocus
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    if (bulkCount > 0) {
                      const availableGrades = [...new Set(schoolClasses.map(c => c.grade))].sort((a, b) => a - b);
                      const defaultGrade = availableGrades[0] ?? 1;
                      const newRows = Array.from({ length: bulkCount }, (_, i) => ({
                        id: `student-bulk-${Date.now()}-${i}-${Math.random().toString(36).substr(2, 5)}`,
                        name: '',
                        grade: defaultGrade,
                        classId: '',
                        parentPhone: ''
                      }));
                      setBulkStudents(newRows);
                      setShowBulkCountModal(false);
                      setIsBulkEntryMode(true);
                    }
                  }}
                  disabled={!bulkCount || bulkCount < 1}
                  className="flex-1 py-3 bg-[#9d8fe8] text-white rounded-xl text-sm font-bold hover:bg-[#8779d0] transition-all shadow-md shadow-[#9d8fe8]/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <Plus size={16} /> إنشاء الجدول
                </button>
                <button
                  onClick={() => setShowBulkCountModal(false)}
                  className="flex-1 py-3 bg-white text-slate-500 border border-slate-200 rounded-xl text-sm font-bold hover:bg-slate-50 transition-all"
                >
                  إلغاء
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════ Student List ══════ */}
      {schoolStudents.length > 0 && (
        <div className="space-y-4">

          {/* Combined Search, Filter & Stats Bar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col-reverse lg:flex-row items-center gap-4 justify-between">
            
            {/* Stats Indicators (Left Side in RTL, so put at End of Flex Row or Start?) 
                RTL: Flex Start is Right. Flex End is Left.
                The user wants Stats on the LEFT.
                So Stats should be at the END of the flex container (if flex-row).
                
                Current Order in Code: Search -> Filter -> Stats
                In RTL Display: Search (Right) -> Filter (Center) -> Stats (Left)
                
                Wait, if it's RTL:
                First Element (Search) -> Right
                Last Element (Stats) -> Left
                
                So the current order IS correct for "Stats on Left".
                The User says "Shift it to the left of the bar".
                It IS on the left.
                Maybe they mean "Far Left" and it wasn't going all the way?
                
                Let's use `flex-1` on the Search bar to push everything else.
                The current Search input has `w-full`.
                
                Let's Force the order explicitely just to be safe and use `flex-grow` on search.
            */}

            {/* Right Side: Search & Filter */}
            <div className="flex flex-col lg:flex-row items-center gap-4 flex-1 w-full">
                {/* Search Input (Expands) */}
                <div className="relative flex-[2] w-full">
                <Search size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                    type="text"
                    placeholder="بحث عن طالب..."
                    value={searchText}
                    onChange={e => setSearchText(e.target.value)}
                    className="w-full pr-12 pl-4 py-3 bg-slate-50 border-0 rounded-xl outline-none text-sm font-bold focus:ring-2 focus:ring-[#8779fb]/20 transition-all text-slate-600 placeholder:text-slate-400"
                />
                {searchText && (
                    <button onClick={() => setSearchText('')} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500">
                    <X size={16} />
                    </button>
                )}
                </div>

                {/* Split Filter (Grade -> Class) */}
                <div className="flex items-center gap-2 w-full lg:w-auto shrink-0">
                    <select
                        value={filterGrade}
                        onChange={e => {
                            const val = e.target.value ? parseInt(e.target.value) : '';
                            setFilterGrade(val);
                            if (val && filterClassId) {
                                const cls = schoolClasses.find(c => c.id === filterClassId);
                                if (cls && cls.grade !== val) setFilterClassId('');
                            }
                        }}
                        className="w-full lg:w-36 px-4 py-3 bg-slate-50 border-0 rounded-xl outline-none text-sm font-bold text-slate-600 focus:ring-2 focus:ring-[#8779fb]/20 transition-all cursor-pointer"
                    >
                        <option value="">جميع الصفوف</option>
                        {Array.from({ length: totalGrades }, (_, i) => i + 1).map(grade => (
                            <option key={grade} value={grade}>الصف {grade}</option>
                        ))}
                    </select>

                    <select
                        value={filterClassId}
                        onChange={e => {
                        setFilterClassId(e.target.value);
                        if (e.target.value) {
                            const cls = schoolClasses.find(c => c.id === e.target.value);
                            if (cls) setFilterGrade(cls.grade);
                        }
                        }}
                        className="w-full lg:w-40 px-4 py-3 bg-slate-50 border-0 rounded-xl outline-none text-sm font-bold text-slate-600 focus:ring-2 focus:ring-[#8779fb]/20 transition-all cursor-pointer"
                    >
                        <option value="">جميع الفصول</option>
                        {Array.from({ length: totalGrades }, (_, i) => i + 1).map(grade => {
                            const classesInGrade = schoolClasses.filter(c => c.grade === grade);
                            if (classesInGrade.length === 0) return null;
                            if (filterGrade && filterGrade !== grade) return null;
                            return (
                                <optgroup key={grade} label={`الصف ${grade}`}>
                                    {classesInGrade.map(c => (
                                        <option key={c.id} value={c.id}>
                                        {c.name || `${c.grade}/${c.section}`}
                                        </option>
                                    ))}
                                </optgroup>
                            );
                        })}
                    </select>
                </div>
            </div>

            <div className="w-px h-8 bg-slate-200 hidden lg:block mx-2"></div>

            {/* Left Side: Stats (Fixed Width) */}
            <div className="flex items-center gap-3 w-full lg:w-auto justify-between lg:justify-end shrink-0">
               {/* Total Count */}
               <div className="flex items-center gap-3 px-5 py-2 bg-[#e5e1fe]/50 rounded-xl min-w-[140px] cursor-default border border-[#e5e1fe] hover:shadow-sm transition-all h-[52px]">
                  <div className="p-1.5 bg-white rounded-lg shadow-sm">
                    <Users size={20} className="text-[#655ac1]" />
                  </div>
                  <div className="flex flex-col justify-center">
                      <span className="text-[10px] font-bold text-slate-400 leading-tight">الإجمالي</span>
                      <span className="text-xl font-black text-[#655ac1] leading-none mt-0.5">{schoolStudents.length}</span>
                  </div>
               </div>
               
               {/* Missing Data Warning */}
               <div 
                  onClick={() => { if(studentsWithMissingData.length > 0) { setShowMissingDataOnly(!showMissingDataOnly); setFilterGrade(''); setFilterClassId(''); } }}
                  className={`flex items-center gap-3 px-5 py-2 rounded-xl min-w-[140px] cursor-pointer transition-all border h-[52px] ${
                      showMissingDataOnly 
                      ? 'bg-amber-100 text-amber-700 border-amber-200 ring-2 ring-amber-200' 
                      : 'bg-amber-50 text-amber-600 border-amber-100/50 hover:bg-amber-100'
                  }`}
               >
                  <div className={`p-1.5 bg-white/60 rounded-lg ${studentsWithMissingData.length > 0 ? "animate-pulse" : ""}`}>
                    <AlertTriangle size={20} className="text-amber-500" />
                  </div>
                  <div className="flex flex-col justify-center">
                      <span className="text-[10px] font-bold text-amber-600/70 leading-tight">بيانات ناقصة</span>
                      <span className="text-xl font-black text-amber-700 leading-none mt-0.5">{studentsWithMissingData.length}</span>
                  </div>
               </div>
            </div>

          </div>

          {/* Selection Actions */}
           {selectedStudents.size > 0 && (
            <div className="flex items-center justify-between p-3 bg-[#e5e1fe]/50 border border-[#e5e1fe] rounded-2xl animate-in slide-in-from-top-2">
                <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-[#655ac1] bg-[#e5e1fe] px-3 py-1.5 rounded-xl">
                        {selectedStudents.size} محدد
                    </span>
                    <span className="text-xs font-bold text-slate-500">
                      من إجمالي {filteredStudents.length} طالب
                    </span>
                </div>
                <button
                    onClick={() => setShowBulkDeleteConfirm(true)}
                    className="flex items-center gap-1 px-3 py-2 bg-rose-50 text-rose-600 border border-rose-200 rounded-xl text-xs font-bold hover:bg-rose-100 transition-all"
                >
                    <Trash size={14} /> حذف المحدد
                </button>
            </div>
           )}

          {/* Bulk Delete Confirmation */}
          {showBulkDeleteConfirm && (
            <div className="flex items-center gap-3 p-4 bg-rose-50 border border-rose-200 rounded-2xl animate-in zoom-in-95 duration-200">
              <AlertTriangle size={20} className="text-rose-500" />
              <span className="text-sm font-bold text-rose-700 flex-1">
                هل أنت متأكد من حذف {selectedStudents.size} طالب؟
              </span>
              <button onClick={handleBulkDelete} className="px-4 py-2 bg-rose-500 text-white rounded-lg text-xs font-bold hover:bg-rose-600 transition-all">
                نعم، احذف
              </button>
              <button onClick={() => setShowBulkDeleteConfirm(false)} className="px-4 py-2 bg-white text-slate-500 rounded-lg text-xs font-bold hover:bg-slate-50 transition-all border border-slate-200">
                إلغاء
              </button>
            </div>
          )}

          {/* Delete All Confirmation Modal */}
          {showDeleteAllConfirm && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-200 p-4">
              <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                  <h3 className="font-black text-lg text-slate-800 flex items-center gap-2">
                    <Trash2 size={20} className="text-rose-500" /> تأكيد الحذف
                  </h3>
                  <button onClick={() => setShowDeleteAllConfirm(false)} className="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-all">
                    <X size={20} />
                  </button>
                </div>
                <div className="p-6">
                  <div className="flex flex-col items-center text-center gap-4 mb-6">
                    <div className="w-16 h-16 bg-rose-50 rounded-full flex items-center justify-center">
                      <AlertTriangle size={32} className="text-rose-500" />
                    </div>
                    <div>
                      <p className="font-black text-slate-800 mb-2">هل أنت متأكد من حذف جميع الطلاب؟</p>
                      <p className="text-sm text-slate-500 font-medium">
                        سيتم حذف <span className="font-black text-rose-500">{schoolStudents.length}</span> طالب بشكل نهائي. لا يمكن التراجع عن هذا الإجراء.
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={handleDeleteAll}
                      className="flex-1 px-4 py-3 bg-rose-500 hover:bg-rose-600 text-white text-sm font-bold rounded-xl transition-all shadow-md shadow-rose-500/20 flex items-center justify-center gap-2"
                    >
                      <Trash2 size={16} /> نعم، احذف الكل
                    </button>
                    <button
                      onClick={() => setShowDeleteAllConfirm(false)}
                      className="flex-1 px-4 py-3 bg-white text-slate-600 border border-slate-200 text-sm font-bold rounded-xl hover:bg-slate-50 transition-all"
                    >
                      إلغاء
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Student Table */}
          <div className="bg-white rounded-[2rem] border border-slate-100 shadow-xl shadow-[#655ac1]/5 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-[#f8f7ff] border-b border-slate-100">
                    <th className="p-4 w-12 text-center">
                      <div
                        onClick={toggleSelectAll}
                        className={`w-5 h-5 rounded-md border-2 flex items-center justify-center mx-auto cursor-pointer transition-all ${
                          filteredStudents.length > 0 && filteredStudents.every(s => selectedStudents.has(s.id))
                            ? 'bg-[#655ac1] border-[#655ac1]'
                            : 'border-slate-300 hover:border-[#655ac1]'
                        }`}
                      >
                        {filteredStudents.length > 0 && filteredStudents.every(s => selectedStudents.has(s.id)) && (
                          <Check size={12} className="text-white" />
                        )}
                      </div>
                    </th>
                    <th className="p-4 text-right text-xs font-black text-[#655ac1] w-12">#</th>
                    <th className="p-4 text-right text-xs font-black text-[#655ac1]">اسم الطالب</th>
                    <th className="p-4 text-center text-xs font-black text-[#655ac1] w-24">الصف</th>
                    <th className="p-4 text-center text-xs font-black text-[#655ac1] w-28">الفصل</th>
                    <th className="p-4 text-center text-xs font-black text-[#655ac1] w-36">رقم ولي الأمر</th>
                    <th className="p-4 text-center text-xs font-black text-[#655ac1] w-28">إجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStudents.map((student, index) => {
                    const isEditing = editingStudent === student.id;
                    const isSelected = selectedStudents.has(student.id);

                    return (
                      <tr
                        key={student.id}
                        className={`border-b border-slate-50 transition-all group ${
                          isSelected ? 'bg-[#e5e1fe]/30' : 'hover:bg-[#e5e1fe]/10'
                        }`}
                      >
                        <td className="p-4 text-center">
                          <div
                            onClick={() => toggleSelect(student.id)}
                            className={`w-5 h-5 rounded-md border-2 flex items-center justify-center mx-auto cursor-pointer transition-all ${
                              isSelected
                                ? 'bg-[#655ac1] border-[#655ac1]'
                                : 'border-slate-200 opacity-40 group-hover:opacity-100 hover:border-[#655ac1]'
                            }`}
                          >
                            {isSelected && <Check size={12} className="text-white" />}
                          </div>
                        </td>
                        <td className="p-4 text-right text-xs font-bold text-slate-400">{index + 1}</td>
                        <td className="p-4">
                          {isEditing ? (
                            <input
                              type="text"
                              value={editName}
                              onChange={e => setEditName(e.target.value)}
                              className="w-full p-2 bg-white border border-[#655ac1] rounded-lg outline-none text-sm font-bold"
                              autoFocus
                              onKeyDown={e => {
                                if (e.key === 'Enter') handleSaveEdit();
                                if (e.key === 'Escape') setEditingStudent(null);
                              }}
                            />
                          ) : (
                            <span className="text-sm font-bold text-slate-800">{student.name}</span>
                          )}
                        </td>
                        <td className="p-4 text-center">
                          <span className="text-xs font-bold text-slate-600 bg-slate-100 px-3 py-1 rounded-full">
                            {student.grade}
                          </span>
                        </td>
                        <td className="p-4 text-center">
                          {isEditing ? (
                            <select
                              value={editClassId}
                              onChange={e => setEditClassId(e.target.value)}
                              className="p-2 bg-white border border-[#655ac1] rounded-lg outline-none text-xs font-bold w-full"
                            >
                              <option value="">غير محدد</option>
                              {schoolClasses.filter(c => c.grade === student.grade).map(c => (
                                <option key={c.id} value={c.id}>{c.name || `${c.grade}/${c.section}`}</option>
                              ))}
                            </select>
                          ) : (
                            <span className={`text-xs font-bold px-3 py-1 rounded-full ${
                              student.classId ? 'text-[#655ac1] bg-[#e5e1fe]' : 'text-amber-500 bg-amber-50'
                            }`}>
                              {getClassName(student.classId)}
                            </span>
                          )}
                        </td>
                        <td className="p-4 text-center">
                          {isEditing ? (
                            <input
                              type="tel"
                              value={editPhone}
                              onChange={e => setEditPhone(e.target.value)}
                              className="w-full p-2 bg-white border border-[#655ac1] rounded-lg outline-none text-xs font-bold text-center"
                              dir="ltr"
                              onKeyDown={e => {
                                if (e.key === 'Enter') handleSaveEdit();
                                if (e.key === 'Escape') setEditingStudent(null);
                              }}
                            />
                          ) : (
                            <span className="text-xs font-bold text-slate-500" dir="ltr">
                              {student.parentPhone || '-'}
                            </span>
                          )}
                        </td>
                        <td className="p-4 text-center">
                          <div className="flex items-center justify-center gap-2 opacity-100">
                            {isEditing ? (
                              <>
                                <button
                                  onClick={handleSaveEdit}
                                  className="p-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-all shadow-sm"
                                  title="حفظ"
                                >
                                  <Check size={14} />
                                </button>
                                <button
                                  onClick={() => setEditingStudent(null)}
                                  className="p-2 bg-slate-100 text-slate-500 rounded-lg hover:bg-slate-200 transition-all"
                                  title="إلغاء"
                                >
                                  <X size={14} />
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  onClick={() => handleStartEdit(student)}
                                  className="p-2 text-slate-400 bg-slate-50 hover:text-[#655ac1] hover:bg-[#e5e1fe] rounded-lg transition-all"
                                  title="تعديل"
                                >
                                  <Pencil size={14} />
                                </button>
                                <button
                                  onClick={() => handleDeleteOne(student.id)}
                                  className="p-2 text-slate-400 bg-slate-50 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all"
                                  title="حذف"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {filteredStudents.length === 0 && schoolStudents.length > 0 && (
              <div className="p-10 text-center text-slate-400">
                <Search size={40} className="mx-auto mb-3 text-slate-200" />
                <p className="font-bold text-sm">لا توجد نتائج مطابقة</p>
                <p className="text-xs mt-1">جرب تعديل كلمات البحث أو الفلاتر</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══════ Empty State ══════ */}
      {schoolStudents.length === 0 && !isImporting && !isBulkEntryMode && (
         <div className="text-center p-6 text-slate-400">
             {/* Additional context if needed, but the cards above cover the actions */}
         </div>
      )}


    </div>
  );
};

export default Step5Students;
