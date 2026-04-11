import React, { useState } from 'react';
import { Phase, Subject } from '../../../types';
import { X, Plus, Edit2, Check, Trash2, BookOpen, RotateCcw, AlertTriangle } from 'lucide-react';

interface GradeDetailsModalProps {
  gradeKey: string;
  gradeName: string;
  department: string;
  phase: Phase;
  subjects: Subject[];
  allSubjects: Subject[];
  onClose: () => void;
  onAddSubject: (subject: Subject) => void;
  onUpdateSubject: (subjectId: string, periodsPerClass: number) => void;
  onDeleteSubject: (subjectId: string) => void;
  onCopySubjectToGrades: (subjectId: string, targetGradeKeys: string[]) => void;
  availableGradesForCopy: { key: string; label: string }[];
}

export const GradeDetailsModal: React.FC<GradeDetailsModalProps> = ({
  gradeKey,
  gradeName,
  department,
  phase,
  subjects,
  allSubjects,
  onClose,
  onAddSubject,
  onUpdateSubject,
  onDeleteSubject,
  onCopySubjectToGrades,
  availableGradesForCopy,
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  // Delete confirmation & trash bin
  const [deleteConfirmSubject, setDeleteConfirmSubject] = useState<Subject | null>(null);
  const [deletedSubjects, setDeletedSubjects] = useState<Subject[]>([]);
  
  // Add subject form state
  const [newSubject, setNewSubject] = useState({
    name: '',
    periods: '2',
  });

  const handleStartEdit = (subject: Subject) => {
    setEditingId(subject.id);
    setEditValue(subject.periodsPerClass.toString());
  };

  const handleSaveEdit = () => {
    if (editingId && editValue) {
      const periods = parseInt(editValue);
      if (periods > 0) {
        onUpdateSubject(editingId, periods);
        setEditingId(null);
        setEditValue('');
      }
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditValue('');
  };

  const handleAddSubject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubject.name || !newSubject.periods) return;

    const subject: Subject = {
      id: `custom-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: newSubject.name,
      specializationIds: [],
      periodsPerClass: parseInt(newSubject.periods),
      phases: [phase],
      department: department as 'عام' | 'تحفيظ',
      isArchived: false,
    };

    onAddSubject(subject);
    setNewSubject({ name: '', periods: '2' });
    setShowAddForm(false);
  };

  const handleConfirmDelete = () => {
    if (!deleteConfirmSubject) return;
    setDeletedSubjects(prev => [deleteConfirmSubject, ...prev]);
    onDeleteSubject(deleteConfirmSubject.id);
    setDeleteConfirmSubject(null);
  };

  const handleRestore = (subject: Subject) => {
    setDeletedSubjects(prev => prev.filter(s => s.id !== subject.id));
    onAddSubject(subject);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
      <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">

        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50 shrink-0">
          <div>
            <h2 className="text-xl font-black text-slate-800">{gradeName}</h2>
            <p className="text-xs text-slate-400 font-bold mt-0.5">
              القسم: <span className="text-[#655ac1]">{department}</span> · المرحلة: <span className="text-[#655ac1]">{phase}</span>
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl transition-colors text-slate-400 hover:text-slate-600">
            <X size={22} />
          </button>
        </div>

        {/* Toolbar */}
        <div className="px-8 py-4 border-b border-slate-100 flex items-center gap-3">
          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-[#655ac1] hover:bg-[#5046a0] text-white rounded-xl font-bold text-sm transition-all shadow-md shadow-[#655ac1]/20 hover:scale-105 active:scale-95"
          >
            <Plus size={18} /> إضافة مادة
          </button>
          {deletedSubjects.length > 0 && (
            <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-xl text-xs font-bold text-amber-700">
              <Trash2 size={14} />
              سلة المحذوفات ({deletedSubjects.length})
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8 space-y-6 custom-scrollbar">

          {/* Active subjects */}
          {subjects.length === 0 ? (
            <div className="text-center py-12 text-slate-300 border-2 border-dashed border-slate-100 rounded-3xl">
              <BookOpen size={48} className="mx-auto mb-4 opacity-30" />
              <p className="text-lg font-bold text-slate-400">لا توجد مواد مضافة لهذا الصف</p>
              <p className="text-sm mt-1 text-slate-400">انقر على "إضافة مادة" للبدء</p>
            </div>
          ) : (
            <div className="border border-slate-200 rounded-2xl bg-white overflow-hidden">
              <div className="divide-y divide-slate-100">
                {subjects.map((subject) => (
                  <div
                    key={subject.id}
                    className="flex items-center gap-4 px-4 py-3 bg-white hover:bg-[#f8f7ff] transition-colors group"
                  >
                    <div className="flex-1">
                      <h3 className="font-black text-slate-800 text-sm">{subject.name}</h3>
                    </div>

                    <div className="flex items-center gap-2">
                      {editingId === subject.id ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            className="w-20 px-3 py-2 border border-[#655ac1] bg-white rounded-xl text-center font-bold outline-none focus:ring-2 focus:ring-[#655ac1]/20"
                            min="1"
                            autoFocus
                          />
                          <button onClick={handleSaveEdit} className="p-2 bg-[#655ac1] hover:bg-[#5046a0] text-white rounded-xl transition-colors">
                            <Check size={16} />
                          </button>
                          <button onClick={handleCancelEdit} className="p-2 bg-slate-200 hover:bg-slate-300 text-slate-600 rounded-xl transition-colors">
                            <X size={16} />
                          </button>
                        </div>
                      ) : (
                        <>
                          <div className="text-center min-w-[60px] bg-white border border-slate-100 rounded-xl px-2 py-1.5 shadow-sm">
                            <p className="text-lg font-black text-[#655ac1]">{subject.periodsPerClass}</p>
                            <p className="text-[9px] font-bold text-slate-400">حصة</p>
                          </div>
                          <div className="w-px h-8 bg-slate-200 rounded-full mx-0.5"></div>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleStartEdit(subject)}
                              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#e5e1fe] text-slate-400 hover:text-[#655ac1] transition-all border border-slate-200 hover:border-[#8779fb]"
                              title="تعديل عدد الحصص"
                            >
                              <Edit2 size={15} />
                            </button>
                            <button
                              onClick={() => setDeleteConfirmSubject(subject)}
                              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-rose-50 transition-all border border-slate-200 hover:border-rose-200 text-rose-500"
                              title="حذف المادة"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Trash bin — recently deleted subjects */}
          {deletedSubjects.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl overflow-hidden">
              <div className="flex items-center gap-2 px-5 py-3 bg-amber-100 border-b border-amber-200">
                <Trash2 size={16} className="text-amber-600" />
                <h4 className="text-sm font-black text-amber-700">سلة المحذوفات</h4>
                <span className="text-xs bg-amber-200 text-amber-700 px-2 py-0.5 rounded-full font-bold">{deletedSubjects.length}</span>
                <span className="text-xs text-amber-500 font-bold mr-auto">يمكنك استعادة أي مادة محذوفة</span>
              </div>
              <div className="divide-y divide-amber-100">
                {deletedSubjects.map(sub => (
                  <div key={sub.id} className="flex items-center gap-4 px-5 py-3 hover:bg-amber-100/50 transition-colors">
                    <div className="flex-1">
                      <span className="font-bold text-slate-600 text-sm line-through opacity-60">{sub.name}</span>
                      <span className="text-xs text-slate-400 font-bold mr-2">· {sub.periodsPerClass} حصة</span>
                    </div>
                    <button
                      onClick={() => handleRestore(sub)}
                      className="flex items-center gap-1.5 px-4 py-2 bg-white border border-amber-300 text-amber-700 rounded-xl text-xs font-black hover:bg-amber-500 hover:text-white hover:border-amber-500 transition-all shadow-sm"
                    >
                      <RotateCcw size={14} /> استعادة
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-8 py-5 border-t border-slate-100 bg-slate-50/50 flex justify-end">
          <button onClick={onClose} className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-6 py-2.5 text-sm font-bold text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-800">
            إغلاق
          </button>
        </div>
      </div>

      {/* Add Subject Modal */}
      {showAddForm && (
        <div className="absolute inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4 z-10">
          <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-md p-8 animate-in zoom-in-95 duration-200">
            <h3 className="text-xl font-black text-slate-800 mb-6">إضافة مادة جديدة</h3>
            <form onSubmit={handleAddSubject} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-2">اسم المادة <span className="text-rose-500">*</span></label>
                <input
                  type="text"
                  value={newSubject.name}
                  onChange={(e) => setNewSubject({ ...newSubject, name: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 focus:border-[#655ac1] outline-none transition-all"
                  placeholder="مثال: اللغة العربية"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-2">عدد الحصص <span className="text-rose-500">*</span></label>
                <input
                  type="number"
                  value={newSubject.periods}
                  onChange={(e) => setNewSubject({ ...newSubject, periods: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-center text-slate-800 focus:border-[#655ac1] outline-none transition-all"
                  min="1"
                  required
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" className="flex-1 px-4 py-3 bg-[#655ac1] hover:bg-[#5046a0] text-white rounded-xl font-bold transition-all">إضافة</button>
                <button type="button" onClick={() => { setShowAddForm(false); setNewSubject({ name: '', periods: '2' }); }} className="flex-1 px-4 py-3 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl font-bold transition-all">إلغاء</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmSubject && (
        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-10">
          <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="bg-gradient-to-br from-rose-50 to-pink-50 px-8 pt-8 pb-6 flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-md mb-4">
                <AlertTriangle size={30} className="text-rose-500" />
              </div>
              <h3 className="text-lg font-black text-slate-800 mb-2">حذف المادة</h3>
              <p className="text-sm font-bold text-slate-500 leading-relaxed">
                هل أنت متأكد من حذف مادة{' '}
                <span className="text-slate-800 font-black">"{deleteConfirmSubject.name}"</span>؟
                <br />
                <span className="text-emerald-600 font-black text-xs mt-1 block">يمكنك استعادتها من سلة المحذوفات.</span>
              </p>
            </div>
            <div className="px-8 py-5 flex gap-3">
              <button onClick={() => setDeleteConfirmSubject(null)} className="flex-1 px-4 py-3 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition-all">إلغاء</button>
              <button onClick={handleConfirmDelete} className="flex-1 px-4 py-3 bg-rose-500 text-white font-bold rounded-xl hover:bg-rose-600 transition-all shadow-lg shadow-rose-200 flex items-center justify-center gap-2">
                <Trash2 size={16} /> نعم، احذف
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
