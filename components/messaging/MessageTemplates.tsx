import React, { useState } from 'react';
import { Plus, Edit3, Trash2, FileText, CheckCircle2, Lock } from 'lucide-react';
import { useMessageArchive } from './MessageArchiveContext';

const MessageTemplates: React.FC = () => {
  const { templates, addTemplate, updateTemplate, deleteTemplate } = useMessageArchive();
  
  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [formData, setFormData] = useState({ title: '', content: '', category: 'غياب طالب' });
  const [customCategory, setCustomCategory] = useState('');

  const PREDEFINED_CATEGORIES = ['غياب طالب', 'تأخر طالب', 'مخالفة سلوكية', 'تعميم داخلي'];

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

  const handleDelete = (id: string, isSystem: boolean) => {
    if (isSystem) return alert('لا يمكن حذف القوالب الأساسية للنظام');
    if (confirm('هل أنت متأكد من حذف هذا القالب؟')) {
      deleteTemplate(id);
    }
  };

  const handleSave = () => {
    if (!formData.title.trim() || !formData.content.trim()) return alert('يجب تعبئة العنوان والمحتوى');
    
    // Determine the final category string
    const finalCategory = formData.category === 'أخرى' 
       ? (customCategory.trim() || 'أخرى') 
       : formData.category;

    if (isEditing) {
      const existing = templates.find(t => t.id === isEditing);
      if (existing) {
        // preserve system status
        updateTemplate({ ...existing, ...formData, category: finalCategory });
      }
      setIsEditing(null);
    } else {
      addTemplate({ ...formData, category: finalCategory, isSystem: false });
    }
    setFormData({ title: '', content: '', category: 'غياب طالب' });
    setCustomCategory('');
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in">
      
      {/* Templates List */}
      <div className="lg:col-span-2 space-y-4">
        <h3 className="text-lg font-bold text-[#1e293b] flex items-center gap-2 mb-2">
           <FileText className="text-[#655ac1]" size={20} />
           القوالب المتوفرة
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {templates.map(t => (
            <div key={t.id} className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 relative group overflow-hidden flex flex-col justify-between">
               {t.isSystem && (
                 <div className="absolute top-0 right-0 bg-slate-100 text-slate-400 p-1.5 rounded-bl-[16px]">
                   <Lock size={14}/>
                 </div>
               )}
               <div>
                 <div className="text-xs font-bold text-[#655ac1] bg-indigo-50 px-2.5 py-1 rounded-lg inline-block mb-3">
                   {t.category || 'أخرى'}
                 </div>
                 <h4 className="font-bold text-[#1e293b] text-base mb-2 pr-6">{t.title}</h4>
                 <p className="text-sm text-slate-500 line-clamp-3 leading-relaxed">{t.content}</p>
               </div>
               
               <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-slate-100 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => handleEdit(t.id)} className="p-2 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition-colors" title="تعديل">
                    <Edit3 size={16}/>
                  </button>
                  <button onClick={() => handleDelete(t.id, t.isSystem)} disabled={t.isSystem} className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors disabled:opacity-50" title="حذف">
                    <Trash2 size={16}/>
                  </button>
               </div>
            </div>
          ))}
        </div>
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
