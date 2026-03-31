import React, { useState } from 'react';
import { Plus, Edit3, Trash2, FileText, CheckCircle2, AlertTriangle, X, RotateCcw } from 'lucide-react';
import { useMessageArchive } from './MessageArchiveContext';

// Mirror of INITIAL_TEMPLATES ids & labels for the restore section
const SYSTEM_TEMPLATE_IDS = ['t1','t2','t3','t4','t5','t6','t7','t8','t9'];

const MessageTemplates: React.FC = () => {
  const { templates, addTemplate, updateTemplate, deleteTemplate, restoreSystemTemplate } = useMessageArchive();

  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [formData, setFormData] = useState({ title: '', content: '', category: 'غياب طالب' });
  const [customCategory, setCustomCategory] = useState('');
  const [toast, setToast] = useState<{ type: 'error' | 'success'; message: string } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const PREDEFINED_CATEGORIES = ['غياب طالب', 'تأخر طالب', 'مخالفة سلوكية', 'تعميم داخلي', 'انتظار', 'إشراف', 'مناوبة', 'تعميم'];

  const showToast = (type: 'error' | 'success', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3500);
  };

  // System templates that have been deleted (missing from current list)
  const deletedSystemTemplates = SYSTEM_TEMPLATE_IDS.filter(
    id => !templates.some(t => t.id === id)
  );

  const handleEdit = (id: string) => {
    const template = templates.find(t => t.id === id);
    if (template) {
      const cat = template.category || 'أخرى';
      if (PREDEFINED_CATEGORIES.includes(cat)) {
        setFormData({ title: template.title, content: template.content, category: cat });
        setCustomCategory('');
      } else {
        setFormData({ title: template.title, content: template.content, category: 'أخرى' });
        setCustomCategory(cat);
      }
      setIsEditing(id);
    }
  };

  const handleDeleteRequest = (id: string) => {
    setConfirmDelete(id);
  };

  const handleConfirmDelete = () => {
    if (confirmDelete) {
      deleteTemplate(confirmDelete);
      setConfirmDelete(null);
      showToast('success', 'تم حذف القالب — يمكنك استعادته من قسم القوالب المحذوفة');
    }
  };

  const handleRestore = (id: string) => {
    restoreSystemTemplate(id);
    showToast('success', 'تمت استعادة القالب بنجاح');
  };

  const handleSave = () => {
    if (!formData.title.trim() || !formData.content.trim()) {
      showToast('error', 'يجب تعبئة العنوان والمحتوى');
      return;
    }

    const finalCategory = formData.category === 'أخرى'
       ? (customCategory.trim() || 'أخرى')
       : formData.category;

    const wasEditing = isEditing;
    if (isEditing) {
      const existing = templates.find(t => t.id === isEditing);
      if (existing) {
        updateTemplate({ ...existing, ...formData, category: finalCategory });
      }
      setIsEditing(null);
    } else {
      addTemplate({ ...formData, category: finalCategory, isSystem: false });
    }
    setFormData({ title: '', content: '', category: 'غياب طالب' });
    setCustomCategory('');
    showToast('success', wasEditing ? 'تم حفظ التغييرات بنجاح' : 'تمت إضافة القالب بنجاح');
  };

  const isSystemTemplate = (id: string) => SYSTEM_TEMPLATE_IDS.includes(id);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in">

      {/* ── Toast Notification ── */}
      {toast && (
        <div className={`fixed top-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-lg border text-sm font-bold transition-all animate-fade-in ${
          toast.type === 'error'
            ? 'bg-red-50 border-red-200 text-red-700'
            : 'bg-emerald-50 border-emerald-200 text-emerald-700'
        }`}>
          {toast.type === 'error' ? <AlertTriangle size={18} /> : <CheckCircle2 size={18} />}
          {toast.message}
          <button onClick={() => setToast(null)} className="mr-2 opacity-60 hover:opacity-100 transition-opacity">
            <X size={16} />
          </button>
        </div>
      )}

      {/* ── Confirm Delete Modal ── */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 animate-fade-in">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 bg-red-50 rounded-xl">
                <Trash2 size={20} className="text-red-500" />
              </div>
              <h3 className="text-base font-black text-slate-800">تأكيد الحذف</h3>
            </div>
            <p className="text-sm text-slate-600 font-medium mb-2 leading-relaxed">
              هل أنت متأكد من حذف هذا القالب؟
            </p>
            {isSystemTemplate(confirmDelete) && (
              <p className="text-xs text-amber-600 font-bold bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 mb-4 flex items-center gap-2">
                <RotateCcw size={13} />
                هذا قالب أساسي — يمكنك استعادته لاحقاً من قسم القوالب المحذوفة
              </p>
            )}
            <div className={`flex gap-3 ${!isSystemTemplate(confirmDelete) ? 'mt-4' : ''}`}>
              <button
                onClick={handleConfirmDelete}
                className="flex-1 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-xl font-bold transition-colors text-sm"
              >
                نعم، احذف القالب
              </button>
              <button
                onClick={() => setConfirmDelete(null)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition-colors text-sm"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Templates List */}
      <div className="lg:col-span-2 space-y-4">
        <h3 className="text-lg font-bold text-[#1e293b] flex items-center gap-2 mb-2">
           <FileText className="text-[#655ac1]" size={20} />
           القوالب المتوفرة
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {templates.map(t => (
            <div key={t.id} className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 relative group overflow-hidden flex flex-col justify-between">
               <div>
                 <div className="text-xs font-bold text-[#655ac1] bg-indigo-50 px-2.5 py-1 rounded-lg inline-block mb-3">
                   {t.category || 'أخرى'}
                 </div>
                 <h4 className="font-bold text-[#1e293b] text-base mb-2">{t.title}</h4>
                 <p className="text-sm text-slate-500 line-clamp-3 leading-relaxed">{t.content}</p>
               </div>

               <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-slate-100">
                  <button
                    onClick={() => handleEdit(t.id)}
                    className="p-2 bg-white text-[#655ac1] rounded-lg border border-slate-200 hover:border-[#655ac1] transition-colors"
                    title="تعديل"
                  >
                    <Edit3 size={16}/>
                  </button>
                  <button
                    onClick={() => handleDeleteRequest(t.id)}
                    className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
                    title="حذف"
                  >
                    <Trash2 size={16}/>
                  </button>
               </div>
            </div>
          ))}
        </div>

        {/* Deleted system templates – restore section */}
        {deletedSystemTemplates.length > 0 && (
          <div className="mt-6 bg-amber-50 border border-amber-200 rounded-2xl p-5">
            <h4 className="text-sm font-black text-amber-800 flex items-center gap-2 mb-4">
              <RotateCcw size={16} className="text-amber-600" />
              القوالب الأساسية المحذوفة ({deletedSystemTemplates.length})
              <span className="text-xs font-medium text-amber-600">— يمكنك استعادتها</span>
            </h4>
            <div className="flex flex-wrap gap-2">
              {deletedSystemTemplates.map(id => {
                // Map id to a label for display
                const labelMap: Record<string, string> = {
                  t1: 'غياب طالب', t2: 'تأخر طالب', t3: 'مخالفة سلوكية',
                  t4: 'الانتظار اليومي', t5: 'التكليف بالإشراف', t6: 'التذكير بالإشراف',
                  t7: 'التكليف بالمناوبة', t8: 'التذكير بالمناوبة', t9: 'التعميم الداخلي',
                };
                return (
                  <button
                    key={id}
                    onClick={() => handleRestore(id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-amber-300 text-amber-800 rounded-xl text-xs font-bold hover:bg-amber-100 hover:border-amber-400 transition-colors"
                  >
                    <RotateCcw size={12} />
                    {labelMap[id] || id}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Form Editor */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 h-fit sticky top-6">
        <h3 className="text-lg font-bold text-[#1e293b] mb-6 flex items-center gap-2 pb-4 border-b border-slate-100">
           {isEditing ? <Edit3 className="text-[#655ac1]" size={20} /> : <Plus className="text-[#655ac1]" size={20} />}
           {isEditing ? 'تعديل القالب' : 'إضافة قالب جديد'}
        </h3>

        <div className="space-y-4">
           <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">عنوان القالب</label>
              <input
                 type="text"
                 dir="rtl"
                 value={formData.title}
                 onChange={e => setFormData({ ...formData, title: e.target.value })}
                 placeholder="مثال: تبليغ غياب..."
                 className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-[#655ac1]"
              />
           </div>

           <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">التصنيف</label>
              <select
                 value={formData.category}
                 onChange={e => {
                    setFormData({ ...formData, category: e.target.value });
                    if (e.target.value !== 'أخرى') setCustomCategory('');
                 }}
                 className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-[#655ac1]"
              >
                {PREDEFINED_CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
                <option value="أخرى">أخرى (كتابة يدوية)</option>
              </select>
           </div>

           {formData.category === 'أخرى' && (
             <div className="animate-fade-in">
                <label className="block text-sm font-semibold text-slate-700 mb-2">نوع التصنيف</label>
                <input
                   type="text"
                   dir="rtl"
                   value={customCategory}
                   onChange={e => setCustomCategory(e.target.value)}
                   placeholder="اكتب اسم التصنيف..."
                   className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-[#655ac1]"
                />
             </div>
           )}

           <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">نص الرسالة</label>
              <textarea
                 value={formData.content}
                 onChange={e => setFormData({ ...formData, content: e.target.value })}
                 placeholder="اكتب المحتوى هنا... يمكنك استخدام {اسم_الطالب}, {اليوم}, {التاريخ}"
                 className="w-full h-32 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-[#655ac1] resize-none"
                 dir="rtl"
              />
           </div>

           <div className="pt-2">
              <button
                onClick={handleSave}
                className="w-full flex items-center justify-center gap-2 bg-[#655ac1] text-white py-3 rounded-xl font-bold hover:bg-[#5b51ae] transition-colors"
               >
                <CheckCircle2 size={18}/> {isEditing ? 'حفظ التغييرات' : 'إضافة القالب'}
              </button>
              {isEditing && (
                 <button
                   onClick={() => { setIsEditing(null); setFormData({ title: '', content: '', category: 'غياب طالب' }); setCustomCategory(''); }}
                   className="w-full mt-2 flex items-center justify-center gap-2 bg-slate-100 text-slate-600 py-3 rounded-xl font-bold hover:bg-slate-200 transition-colors"
                 >
                   إلغاء
                 </button>
              )}
           </div>
        </div>
      </div>
    </div>
  );
};

export default MessageTemplates;
