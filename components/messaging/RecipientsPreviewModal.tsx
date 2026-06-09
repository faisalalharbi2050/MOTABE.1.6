import React, { useEffect, useMemo, useState } from 'react';
import ReactDOM from 'react-dom';
import { Users, X, Search, Smartphone } from 'lucide-react';

export type PreviewRole = 'teacher' | 'admin' | 'guardian' | 'student' | 'other';

export interface PreviewRecipient {
  id: string;
  name: string;
  subtitle?: string;      // الصفة (معلم / وكيل / طالب ...)
  role: PreviewRole;
  phone?: string;
  classLabel?: string;
}

interface RecipientsPreviewModalProps {
  open: boolean;
  onClose: () => void;
  recipients: PreviewRecipient[];
  /** Optional removal action — shows an "إزالة" button per row when provided. */
  onRemove?: (id: string) => void;
  title?: string;
}

type Filter = 'all' | 'teacher' | 'admin' | 'guardian' | 'nophone';

const RENDER_CAP = 100;

/**
 * Unified recipients-preview modal — the single reference used across the
 * Messages composer and the supervision / duty send pages.
 */
const RecipientsPreviewModal: React.FC<RecipientsPreviewModalProps> = ({
  open, onClose, recipients, onRemove, title = 'معاينة المستلمين',
}) => {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Filter>('all');

  // Reset search/filter each time the modal is opened
  useEffect(() => {
    if (open) { setSearch(''); setFilter('all'); }
  }, [open]);

  const summary = useMemo(() => {
    let teacher = 0, admin = 0, guardian = 0, noPhone = 0;
    for (const r of recipients) {
      if (r.role === 'teacher') teacher++;
      else if (r.role === 'admin') admin++;
      else if (r.role === 'guardian') guardian++;
      if (!r.phone) noPhone++;
    }
    return { teacher, admin, guardian, noPhone };
  }, [recipients]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return recipients.filter(r => {
      if (filter === 'teacher' && r.role !== 'teacher') return false;
      if (filter === 'admin' && r.role !== 'admin') return false;
      if (filter === 'guardian' && r.role !== 'guardian') return false;
      if (filter === 'nophone' && r.phone) return false;
      if (q && !(r.name.toLowerCase().includes(q) || (r.phone || '').includes(q))) return false;
      return true;
    });
  }, [recipients, search, filter]);

  if (!open || typeof document === 'undefined') return null;

  const chipBase = 'px-4 py-2.5 rounded-xl border text-sm font-bold transition-all';
  const chipFor = (id: Filter) =>
    filter === id
      ? `${chipBase} border-[#655ac1] text-white bg-[#655ac1]`
      : `${chipBase} border-slate-200 text-slate-600 bg-white hover:border-[#655ac1] hover:text-white hover:bg-[#655ac1]`;

  return ReactDOM.createPortal(
    <div className="fixed inset-0 bg-slate-900/45 backdrop-blur-sm z-[220] flex items-center justify-center p-4" dir="rtl" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[82vh] border border-slate-200" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between gap-3 bg-white shrink-0">
          <h3 className="font-black text-slate-800 flex items-center gap-3 min-w-0">
            <Users className="text-[#655ac1] shrink-0" size={22} />
            {title}
          </h3>
          <button onClick={onClose} className="p-2 bg-white border border-slate-300 hover:bg-slate-50 rounded-full text-slate-500 transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Summary filters */}
        {recipients.length > 0 && (
          <div className="px-6 pt-4">
            <div className="flex flex-wrap items-center gap-2">
              <button type="button" onClick={() => setFilter('all')} className={chipFor('all')}>الإجمالي {recipients.length}</button>
              {summary.teacher > 0 && <button type="button" onClick={() => setFilter('teacher')} className={chipFor('teacher')}>معلمون {summary.teacher}</button>}
              {summary.admin > 0 && <button type="button" onClick={() => setFilter('admin')} className={chipFor('admin')}>إداريون {summary.admin}</button>}
              {summary.guardian > 0 && <button type="button" onClick={() => setFilter('guardian')} className={chipFor('guardian')}>أولياء أمور {summary.guardian}</button>}
              {summary.noPhone > 0 && <button type="button" onClick={() => setFilter('nophone')} className={chipFor('nophone')}>بلا جوال {summary.noPhone}</button>}
            </div>
          </div>
        )}

        {/* Search */}
        {recipients.length > 0 && (
          <div className="px-6 pt-3">
            <div className="relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
                type="text"
                placeholder="بحث بالاسم أو الجوال..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full border-2 border-slate-200 rounded-xl pr-10 pl-4 py-2.5 outline-none focus:border-[#655ac1] text-sm font-bold text-slate-600 transition-all"
              />
            </div>
          </div>
        )}

        {/* List */}
        <div className="flex-1 overflow-y-auto px-6 py-4 custom-scrollbar">
          {recipients.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-400">
              <Users size={40} className="mb-3 opacity-50" />
              <p className="font-bold text-sm">لم تحدد أي مستلم بعد</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-400">
              <Search size={36} className="mb-3 opacity-50" />
              <p className="font-bold text-sm">لا نتائج مطابقة</p>
            </div>
          ) : (
            <>
              <div className="space-y-2">
                {filtered.slice(0, RENDER_CAP).map(rec => (
                  <div key={rec.id} className="flex items-center justify-between gap-3 p-3 rounded-xl border border-slate-100 hover:bg-slate-50 transition-colors">
                    <div className="min-w-0">
                      <div className="font-bold text-slate-800 text-sm">{rec.name}</div>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        {rec.subtitle && <span className="text-[11px] font-bold text-slate-400">{rec.subtitle}</span>}
                        {rec.classLabel && <span className="text-[11px] font-bold text-slate-400">— {rec.classLabel}</span>}
                        {rec.phone ? (
                          <span className="flex items-center gap-1">
                            <Smartphone size={13} className="text-[#655ac1]" />
                            <span className="text-[13px] font-bold text-[#655ac1]" dir="ltr">{rec.phone}</span>
                          </span>
                        ) : (
                          <span className="text-xs text-rose-500 font-bold">لا يوجد رقم</span>
                        )}
                      </div>
                    </div>
                    {onRemove && (
                      <button
                        type="button"
                        onClick={() => onRemove(rec.id)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-bold text-rose-600 hover:border-rose-300 hover:bg-rose-50 transition-colors shrink-0"
                      >
                        <X size={13} strokeWidth={3} /> إزالة
                      </button>
                    )}
                  </div>
                ))}
              </div>
              {filtered.length > RENDER_CAP && (
                <p className="mt-3 text-center text-[11px] font-bold text-slate-400">
                  يُعرض {RENDER_CAP} من {filtered.length} — استخدم البحث للوصول لبقية المستلمين.
                </p>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end border-t border-slate-100 bg-white p-4 shrink-0">
          <button type="button" onClick={onClose} className="px-6 py-2.5 bg-white border border-slate-300 text-slate-700 rounded-xl font-bold text-sm hover:bg-slate-50 transition-colors">
            إغلاق
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default RecipientsPreviewModal;
