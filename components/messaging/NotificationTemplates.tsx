import React, { useEffect, useMemo, useRef, useState } from 'react';
import ReactDOM from 'react-dom';
import { LayoutTemplate, ChevronDown, Edit3, RotateCcw, X, CheckCircle2, Sparkles } from 'lucide-react';
import {
  MESSAGE_CATALOG, CATALOG_PAGE_LABELS, CatalogPageId, MessageCatalogEntry,
  getMessageTemplate, isTemplateCustomized, saveMessageTemplate, resetMessageTemplate,
  subscribeToCatalogChanges,
} from '../../utils/messageCatalog';

const PAGE_ORDER: CatalogPageId[] = ['schedule', 'supervision', 'duty', 'waiting', 'students', 'circulars'];

type Props = {
  showToast: (type: 'error' | 'success', message: string) => void;
};

const NotificationTemplates: React.FC<Props> = ({ showToast }) => {
  const [expandedPages, setExpandedPages] = useState<Set<CatalogPageId>>(new Set());
  const [editingEntry, setEditingEntry] = useState<MessageCatalogEntry | null>(null);
  const [editText, setEditText] = useState('');
  const editInputRef = useRef<HTMLTextAreaElement>(null);
  // إعادة قراءة التخصيصات عند أي تغيير (من هذا التبويب أو من صفحات الإرسال مستقبلاً)
  const [version, setVersion] = useState(0);
  useEffect(() => subscribeToCatalogChanges(() => setVersion(v => v + 1)), []);

  const entriesByPage = useMemo(() => {
    const groups = new Map<CatalogPageId, MessageCatalogEntry[]>();
    PAGE_ORDER.forEach(page => groups.set(page, MESSAGE_CATALOG.filter(entry => entry.page === page)));
    return groups;
  }, []);

  const togglePage = (page: CatalogPageId) => {
    setExpandedPages(current => {
      const next = new Set(current);
      if (next.has(page)) next.delete(page); else next.add(page);
      return next;
    });
  };

  const openEditor = (entry: MessageCatalogEntry) => {
    setEditingEntry(entry);
    setEditText(getMessageTemplate(entry.id));
  };

  const closeEditor = () => {
    setEditingEntry(null);
    setEditText('');
  };

  const handleSave = () => {
    if (!editingEntry) return;
    if (!editText.trim()) {
      showToast('error', 'نص القالب فارغ');
      return;
    }
    saveMessageTemplate(editingEntry.id, editText);
    showToast('success', 'تم حفظ قالب الإشعار');
    closeEditor();
  };

  const handleReset = (entry: MessageCatalogEntry) => {
    resetMessageTemplate(entry.id);
    showToast('success', 'تمت استعادة النص الافتراضي');
  };

  const insertToken = (token: string) => {
    const tag = `{${token}}`;
    const input = editInputRef.current;
    if (!input) {
      setEditText(prev => prev + tag);
      return;
    }
    const start = input.selectionStart ?? editText.length;
    const end = input.selectionEnd ?? start;
    setEditText(prev => prev.slice(0, start) + tag + prev.slice(end));
    requestAnimationFrame(() => {
      input.focus();
      const caret = start + tag.length;
      input.setSelectionRange(caret, caret);
    });
  };

  return (
    <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-200">
      <div className="flex items-center justify-between gap-3 mb-2 flex-wrap">
        <h3 className="text-lg font-black text-[#1e293b] flex items-center gap-2">
          <LayoutTemplate className="text-[#655ac1]" size={20} />
          قوالب الرسائل والإشعارات
        </h3>
      </div>
      <p className="text-xs font-bold text-slate-400 mb-5 leading-relaxed">
        قوالب جاهزة ويمكنك تعديل الصياغة وفق تفضيلك.
      </p>

      <div className="space-y-3" key={version}>
        {PAGE_ORDER.map(page => {
          const entries = entriesByPage.get(page) || [];
          const isExpanded = expandedPages.has(page);
          const customizedCount = entries.filter(entry => isTemplateCustomized(entry.id)).length;
          return (
            <div key={page} className="border border-slate-200 rounded-2xl overflow-hidden">
              <button
                type="button"
                onClick={() => togglePage(page)}
                className="w-full p-3.5 flex items-center justify-between gap-3 bg-white transition-colors group"
              >
                <span className="font-bold text-slate-700 group-hover:text-[#655ac1] text-sm">{CATALOG_PAGE_LABELS[page]}</span>
                <span className="flex items-center gap-2.5">
                  {customizedCount > 0 && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-black text-[#655ac1] bg-[#f0edff] px-2 py-1 rounded-lg">
                      <Sparkles size={11} /> {customizedCount} مخصص
                    </span>
                  )}
                  <span className="text-xs font-bold text-slate-400 bg-white px-2 py-1 rounded-lg border border-slate-200">
                    {entries.length} أنواع
                  </span>
                  <ChevronDown size={17} className={`text-slate-400 group-hover:text-[#655ac1] transition-all ${isExpanded ? 'rotate-180' : ''}`} />
                </span>
              </button>

              {isExpanded && (
                <div className="border-t border-slate-100 divide-y divide-slate-100">
                  {entries.map(entry => {
                    const customized = isTemplateCustomized(entry.id);
                    const currentText = getMessageTemplate(entry.id);
                    return (
                      <div key={entry.id} className="p-3.5 flex items-start justify-between gap-3 hover:bg-slate-50/60 transition-colors">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-bold text-[#655ac1]">{entry.label}</span>
                            {customized && (
                              <span className="text-[10px] font-black text-[#655ac1] bg-[#f0edff] px-1.5 py-0.5 rounded-md">مخصص</span>
                            )}
                          </div>
                          <p className="text-[11px] font-bold text-slate-400 mt-0.5">{entry.description}</p>
                          <p className="text-[13px] font-semibold text-slate-600 mt-1.5 truncate leading-relaxed" dir="rtl">{currentText.split('\n').slice(0, 2).join(' — ')}</p>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {customized && (
                            <button
                              type="button"
                              onClick={() => handleReset(entry)}
                              className="p-2 bg-white text-slate-500 rounded-lg border border-slate-200 hover:border-slate-400 hover:text-slate-700 transition-colors"
                              title="استعادة النص الافتراضي"
                            >
                              <RotateCcw size={15} />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => openEditor(entry)}
                            className="p-2 bg-transparent text-slate-500 rounded-lg border border-slate-200 hover:border-[#655ac1] hover:text-[#655ac1] transition-colors"
                            title="تعديل القالب"
                          >
                            <Edit3 size={15} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── نافذة تحرير القالب ── */}
      {editingEntry && typeof document !== 'undefined' && ReactDOM.createPortal(
        <div className="fixed inset-0 bg-slate-900/45 backdrop-blur-sm z-[220] flex items-center justify-center p-4" onClick={closeEditor}>
          <div
            className="bg-white rounded-[2rem] shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto custom-scrollbar p-6 animate-fade-in border border-slate-200"
            dir="rtl"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 mb-1">
              <h3 className="text-base font-black text-slate-800 flex items-center gap-2">
                <Edit3 size={17} className="text-[#655ac1]" />
                {CATALOG_PAGE_LABELS[editingEntry.page]} — {editingEntry.label}
              </h3>
              <button
                onClick={closeEditor}
                className="w-8 h-8 inline-flex items-center justify-center rounded-full border border-slate-300 bg-transparent text-slate-400 hover:text-slate-600 hover:border-slate-400 transition-colors shrink-0"
              >
                <X size={16} />
              </button>
            </div>
            <p className="text-[11px] font-bold text-slate-400 mb-4">{editingEntry.description}</p>

            <div className="mb-3 rounded-2xl border border-slate-200 p-3">
              <div className="flex items-center justify-between gap-2 mb-2">
                <label className="text-xs font-bold text-slate-500">المتغيرات المتاحة:</label>
                <span className="text-[10px] font-bold text-slate-400">انقر لإدراجها مكان المؤشر</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {editingEntry.tokens.map(token => (
                  <button
                    key={token}
                    type="button"
                    onClick={() => insertToken(token)}
                    className="px-2.5 py-1.5 bg-white border border-slate-200 text-slate-600 rounded-lg text-[11px] font-bold hover:border-[#655ac1] hover:text-[#655ac1] active:scale-95 transition-all"
                  >
                    {token.replace(/_/g, ' ')}
                  </button>
                ))}
              </div>
            </div>

            <textarea
              ref={editInputRef}
              value={editText}
              onChange={e => setEditText(e.target.value)}
              className="w-full h-48 border-2 border-slate-200 rounded-xl p-3.5 outline-none focus:border-[#655ac1] resize-none text-sm leading-relaxed font-medium text-slate-700"
              dir="rtl"
            />

            {/* استعادة الافتراضي ممتد أعلى الأزرار بلون مميز حتى لا يلتبس بإجراءات الحفظ/الإغلاق */}
            <button
              type="button"
              onClick={() => setEditText(editingEntry.defaultText)}
              className="w-full mt-4 py-2.5 bg-transparent border border-slate-300 text-slate-600 rounded-xl font-bold hover:bg-slate-50 transition-colors text-sm flex items-center justify-center gap-1.5"
            >
              <RotateCcw size={14} /> استعادة النص الافتراضي
            </button>
            <div className="flex gap-2.5 mt-2.5">
              <button
                type="button"
                onClick={closeEditor}
                className="flex-1 py-2.5 bg-transparent border border-slate-300 hover:bg-slate-50 text-slate-600 rounded-xl font-bold transition-colors text-sm"
              >
                إغلاق
              </button>
              <button
                type="button"
                onClick={handleSave}
                className="flex-1 flex items-center justify-center gap-2 bg-[#655ac1] text-white py-2.5 rounded-xl font-bold hover:bg-[#5b51ae] transition-colors text-sm"
              >
                <CheckCircle2 size={16} /> حفظ القالب
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default NotificationTemplates;
