import React, { useEffect, useRef, useState } from 'react';
import ReactDOM from 'react-dom';
import { Plus, Edit3, Trash2, LayoutTemplate, CheckCircle2, AlertTriangle, X, ChevronDown, Check } from 'lucide-react';
import { useMessageArchive } from './MessageArchiveContext';

const PREDEFINED_CATEGORIES = ['غياب طالب', 'تأخر طالب', 'مخالفة سلوكية', 'تعميم'];

const SelectDropdown: React.FC<{
  value: string;
  options: Array<{ value: string; label: string }>;
  placeholder: string;
  onChange: (value: string) => void;
}> = ({ value, options, placeholder, onChange }) => {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ top: 0, left: 0, width: 300 });
  const selected = options.find(option => option.value === value);

  useEffect(() => {
    if (!open) return;
    const updatePosition = () => {
      if (!triggerRef.current) return;
      const rect = triggerRef.current.getBoundingClientRect();
      const margin = 16;
      const width = Math.min(430, Math.max(260, rect.width));
      const safeWidth = Math.min(width, window.innerWidth - margin * 2);
      setPosition({
        top: rect.bottom + 10,
        left: Math.min(Math.max(margin, rect.left), window.innerWidth - safeWidth - margin),
        width: safeWidth,
      });
    };
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (!triggerRef.current?.contains(target) && !panelRef.current?.contains(target)) setOpen(false);
    };
    updatePosition();
    window.addEventListener('resize', updatePosition);
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      window.removeEventListener('resize', updatePosition);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [open]);

  return (
    <div className="w-full">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(current => !current)}
        className="w-full px-5 py-2.5 bg-white border-2 border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-50 hover:border-[#655ac1]/30 transition-all flex items-center justify-between gap-2"
      >
        <span className="truncate text-[13px] leading-tight">{selected?.label || placeholder}</span>
        <ChevronDown size={16} className={`text-[#655ac1] transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && ReactDOM.createPortal(
        <div
          ref={panelRef}
          className="fixed bg-white rounded-2xl shadow-2xl border border-slate-200 p-2.5 z-[130] animate-in slide-in-from-top-2"
          style={{ top: position.top, left: position.left, width: position.width }}
        >
          <div className="max-h-72 overflow-y-auto custom-scrollbar space-y-1 pr-1">
            {options.map(option => (
              <button
                key={option.value}
                type="button"
                onClick={() => { onChange(option.value); setOpen(false); }}
                className={`w-full text-right px-3 py-2.5 text-sm font-bold rounded-xl transition-all flex items-center justify-between ${
                  value === option.value ? 'bg-white text-[#655ac1]' : 'text-slate-700 hover:bg-[#f0edff] hover:text-[#655ac1]'
                }`}
              >
                <span>{option.label}</span>
                <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full border-2 transition-all ${
                  value === option.value ? 'bg-white border-[#655ac1] text-[#655ac1]' : 'bg-white border-slate-300 text-transparent'
                }`}>
                  <Check size={12} strokeWidth={3} />
                </span>
              </button>
            ))}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

const MessageTemplates: React.FC = () => {
  const { templates, addTemplate, updateTemplate, deleteTemplate } = useMessageArchive();

  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [formData, setFormData] = useState({ title: '', content: '', category: 'غياب طالب' });
  const [toast, setToast] = useState<{ type: 'error' | 'success'; message: string } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const showToast = (type: 'error' | 'success', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3500);
  };

  const handleEdit = (id: string) => {
    const template = templates.find(t => t.id === id);
    if (template) {
      const cat = PREDEFINED_CATEGORIES.includes(template.category || '') ? template.category || 'غياب طالب' : 'غياب طالب';
      setFormData({ title: template.title, content: template.content, category: cat });
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
      showToast('success', 'تم حذف القالب');
    }
  };

  const handleSave = () => {
    if (!formData.title.trim() || !formData.content.trim()) {
      showToast('error', 'يجب تعبئة العنوان والمحتوى');
      return;
    }

    const finalCategory = formData.category;

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
    showToast('success', wasEditing ? 'تم حفظ التغييرات بنجاح' : 'تمت إضافة القالب بنجاح');
  };

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
            <div className="flex gap-3 mt-4">
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
           <LayoutTemplate className="text-[#655ac1]" size={20} />
           القوالب المتوفرة
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {templates.map(t => (
            <div key={t.id} className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 relative group overflow-hidden flex flex-col justify-between">
               <div>
                 <h4 className="font-bold text-[#655ac1] text-base mb-2">{t.title}</h4>
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
                    className="p-2 bg-white text-red-600 rounded-lg border border-slate-200 hover:border-red-300 transition-colors"
                    title="حذف"
                  >
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
              <SelectDropdown
                value={formData.category}
                onChange={category => setFormData({ ...formData, category })}
                placeholder="اختر التصنيف"
                options={PREDEFINED_CATEGORIES.map(cat => ({ value: cat, label: cat }))}
              />
           </div>

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
                   onClick={() => { setIsEditing(null); setFormData({ title: '', content: '', category: 'غياب طالب' }); }}
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
