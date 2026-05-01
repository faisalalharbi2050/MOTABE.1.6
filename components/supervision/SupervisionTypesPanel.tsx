import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Check, Lightbulb, ListTree, Plus, Trash2, X } from 'lucide-react';
import { SupervisionType } from '../../types';

const CARD_CLASS = 'bg-white rounded-[2rem] p-5 sm:p-6 shadow-sm border-2 border-slate-200';
const MAIN_TABLE_ID = '__main__';

interface Props {
  supervisionTypes: SupervisionType[];
  setSupervisionTypes: (
    t: SupervisionType[] | ((prev: SupervisionType[]) => SupervisionType[])
  ) => void;
  showToast: (msg: string, type: 'success' | 'warning' | 'error') => void;
}

interface SupervisionTableDraft {
  id: string;
  name: string;
  isMain?: boolean;
}

const TYPE_ORDER: Record<string, number> = {
  break: 1,
  prayer: 2,
  floor: 3,
  assembly: 4,
};

const getTypeLabel = (type: SupervisionType) =>
  type.id === 'assembly' || type.category === 'assembly'
    ? 'الاصطفاف'
    : type.name;

const RoundCheck: React.FC<{ checked: boolean; disabled?: boolean }> = ({ checked, disabled }) => (
  <span
    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
      checked
        ? 'bg-white border-[#655ac1] text-[#655ac1]'
        : disabled
          ? 'bg-slate-100 border-slate-200 text-slate-300'
          : 'bg-white border-slate-300 text-transparent'
    }`}
  >
    {checked && <Check size={12} strokeWidth={3} />}
  </span>
);

const SupervisionTypesPanel: React.FC<Props> = ({
  supervisionTypes,
  setSupervisionTypes,
  showToast,
}) => {
  const [draftTables, setDraftTables] = useState<SupervisionTableDraft[]>([]);
  const [tableToDelete, setTableToDelete] = useState<SupervisionTableDraft | null>(null);

  useEffect(() => {
    setSupervisionTypes(prev =>
      prev.map(type => (
        type.id === 'assembly' && type.name === 'الاصطفاف الصباحي'
          ? { ...type, name: 'الاصطفاف' }
          : type
      ))
    );
  }, [setSupervisionTypes]);

  const sorted = useMemo(
    () => [...supervisionTypes].sort((a, b) => {
      const aOrder = TYPE_ORDER[a.id] ?? TYPE_ORDER[a.category] ?? a.sortOrder + 10;
      const bOrder = TYPE_ORDER[b.id] ?? TYPE_ORDER[b.category] ?? b.sortOrder + 10;
      return aOrder - bOrder || a.sortOrder - b.sortOrder;
    }),
    [supervisionTypes],
  );

  const tables = useMemo<SupervisionTableDraft[]>(() => {
    const map = new Map<string, SupervisionTableDraft>();
    map.set(MAIN_TABLE_ID, { id: MAIN_TABLE_ID, name: 'جدول الإشراف اليومي', isMain: true });

    sorted.forEach(type => {
      if (!type.isEnabled || type.displayMode !== 'separate') return;
      const id = type.tableGroup || `solo-${type.id}`;
      if (!map.has(id)) {
        map.set(id, { id, name: id.startsWith('solo-') ? type.name : id });
      }
    });

    draftTables.forEach(table => {
      if (!map.has(table.id)) map.set(table.id, table);
    });

    return Array.from(map.values());
  }, [sorted, draftTables]);

  const getTypeTableId = (type: SupervisionType) => {
    if (!type.isEnabled) return null;
    if (type.displayMode === 'inline') return MAIN_TABLE_ID;
    return type.tableGroup || `solo-${type.id}`;
  };

  const isTypeUsedInAnotherTable = (type: SupervisionType, tableId: string) => {
    const usedTable = getTypeTableId(type);
    return !!usedTable && usedTable !== tableId;
  };

  const setTypeInTable = (type: SupervisionType, table: SupervisionTableDraft, checked: boolean) => {
    setSupervisionTypes(prev =>
      prev.map(item => {
        if (item.id !== type.id) return item;
        if (!checked) return { ...item, isEnabled: false };
        if (table.isMain) {
          return { ...item, isEnabled: true, displayMode: 'inline', tableGroup: undefined };
        }
        return { ...item, isEnabled: true, displayMode: 'separate', tableGroup: table.id };
      })
    );
  };

  const addTable = () => {
    const id = `table-${Date.now()}`;
    setDraftTables(prev => [...prev, { id, name: 'جدول إشراف جديد' }]);
    showToast('تمت إضافة جدول إشراف جديد', 'success');
  };

  const renameTable = (table: SupervisionTableDraft, name: string) => {
    const cleanName = name.trim();
    if (!cleanName || table.isMain) return;

    setDraftTables(prev => prev.map(item => (
      item.id === table.id ? { ...item, id: cleanName, name: cleanName } : item
    )));
    setSupervisionTypes(prev => prev.map(type => (
      type.displayMode === 'separate' && (type.tableGroup || `solo-${type.id}`) === table.id
        ? { ...type, tableGroup: cleanName }
        : type
    )));
  };

  const confirmRemoveTable = () => {
    if (!tableToDelete || tableToDelete.isMain) return;
    setDraftTables(prev => prev.filter(item => item.id !== tableToDelete.id));
    setSupervisionTypes(prev => prev.map(type => (
      type.displayMode === 'separate' && (type.tableGroup || `solo-${type.id}`) === tableToDelete.id
        ? { ...type, isEnabled: false }
        : type
    )));
    setTableToDelete(null);
    showToast('تم حذف جدول الإشراف', 'success');
  };

  const addCustomTypeToTable = (table: SupervisionTableDraft) => {
    const id = `custom-${Date.now()}`;
    const maxSort = Math.max(0, ...supervisionTypes.map(type => type.sortOrder));
    setSupervisionTypes(prev => [
      ...prev,
      {
        id,
        category: 'custom',
        name: 'نوع إشراف جديد',
        isBuiltIn: false,
        isEnabled: true,
        displayMode: table.isMain ? 'inline' : 'separate',
        tableGroup: table.isMain ? undefined : table.id,
        sortOrder: maxSort + 1,
      },
    ]);
  };

  const renameType = (typeId: string, name: string) => {
    setSupervisionTypes(prev =>
      prev.map(type => (type.id === typeId ? { ...type, name } : type))
    );
  };

  const deleteCustom = (id: string) => {
    setSupervisionTypes(prev => prev.filter(type => type.id !== id));
    showToast('تم حذف نوع الإشراف', 'success');
  };

  return (
    <div className={CARD_CLASS}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div className="flex items-center gap-4">
          <ListTree size={28} strokeWidth={1.8} className="text-[#655ac1] shrink-0" />
          <div>
            <h3 className="text-lg font-black text-slate-800">تصميم جدول الإشراف اليومي</h3>
            <p className="text-xs font-medium text-slate-500 mt-1">
              اختر أنواع الإشراف داخل كل جدول. النوع الواحد لا يمكن استخدامه في أكثر من جدول.
            </p>
          </div>
        </div>
        <button
          onClick={addTable}
          className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-sm font-bold bg-[#655ac1] hover:bg-[#8779fb] text-white shadow-md shadow-[#655ac1]/20 transition-all w-full sm:w-auto"
        >
          <Plus size={16} />
          إضافة جدول إشراف آخر
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start overflow-visible">
        {tables.map(table => (
          <div key={table.id} className="relative z-0 min-w-0 h-fit rounded-2xl border-2 border-slate-200 p-4 bg-white">
            <div className="flex items-center justify-between gap-3 mb-4">
              <div className="flex-1">
                {table.isMain ? (
                  <h4 className="text-sm font-black text-slate-800">{table.name}</h4>
                ) : (
                  <input
                    defaultValue={table.name}
                    onBlur={event => renameTable(table, event.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm font-black text-slate-800 outline-none focus:ring-2 focus:ring-[#655ac1]/30 focus:border-[#655ac1]"
                  />
                )}
              </div>
              {!table.isMain && (
                <button
                  onClick={() => setTableToDelete(table)}
                  className="p-2 rounded-xl border border-red-100 text-red-500 hover:bg-red-50 transition-colors"
                  title="حذف الجدول"
                >
                  <Trash2 size={16} />
                </button>
              )}
            </div>

            <div className="divide-y divide-slate-100">
              {sorted.map(type => {
                const checked = getTypeTableId(type) === table.id;
                const usedElsewhere = isTypeUsedInAnotherTable(type, table.id);
                return (
                  <label
                    key={type.id}
                    className={`flex items-center gap-3 px-2 py-3 transition-all ${
                      checked
                        ? 'bg-white text-slate-800'
                        : usedElsewhere
                          ? 'bg-slate-50/60 text-slate-400 cursor-not-allowed'
                          : 'bg-white text-slate-700 hover:bg-slate-50 cursor-pointer'
                    }`}
                    title={usedElsewhere ? 'تم اختيار هذا النوع في جدول آخر' : undefined}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={usedElsewhere}
                      onChange={event => setTypeInTable(type, table, event.target.checked)}
                      className="sr-only"
                    />
                    {type.isBuiltIn ? (
                      <span className="text-sm font-black flex-1">{getTypeLabel(type)}</span>
                    ) : (
                      <input
                        value={type.name}
                        onChange={event => renameType(type.id, event.target.value)}
                        onClick={event => event.stopPropagation()}
                        className="flex-1 px-3 py-2 rounded-lg border border-slate-200 text-sm font-bold text-slate-800 outline-none focus:ring-2 focus:ring-[#655ac1]/30 focus:border-[#655ac1]"
                      />
                    )}
                    {!type.isBuiltIn && (
                      <button
                        type="button"
                        onClick={event => {
                          event.preventDefault();
                          deleteCustom(type.id);
                        }}
                        className="p-2 rounded-lg text-red-500 hover:bg-red-50 transition-colors"
                        title="حذف"
                      >
                        <Trash2 size={15} />
                      </button>
                    )}
                    <RoundCheck checked={checked} disabled={usedElsewhere} />
                  </label>
                );
              })}
            </div>

            <button
              onClick={() => addCustomTypeToTable(table)}
              className="mt-3 inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold bg-white border border-slate-300 text-slate-700 hover:border-[#655ac1] transition-all"
            >
              <Plus size={16} />
              إضافة
            </button>
          </div>
        ))}
      </div>

      <div className="mt-4 flex items-start gap-2 p-3 rounded-xl bg-amber-50 border border-amber-200">
        <Lightbulb size={16} className="text-amber-500 shrink-0 mt-0.5" />
        <span className="text-[11px] font-medium text-amber-800 leading-relaxed">
          الإنشاء التلقائي لجدول الإشراف يتم توزيع إشراف الفسحة وإشراف الصلاة فقط ، وأما باقي أنواع الإشراف مثل إشراف الأدوار فتظهر خاناتها فارغة للتعبئة اليدوية.
        </span>
      </div>

      {tableToDelete && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 p-4" onClick={() => setTableToDelete(null)}>
          <div className="bg-white rounded-[2rem] shadow-2xl p-6 w-full max-w-md" onClick={event => event.stopPropagation()}>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 rounded-2xl bg-rose-50 flex items-center justify-center">
                <AlertTriangle size={24} className="text-rose-500" />
              </div>
              <h3 className="text-lg font-black text-slate-800">تأكيد حذف الجدول</h3>
            </div>
            <p className="text-sm text-slate-600 font-medium leading-relaxed mb-5">
              هل أنت متأكد من حذف هذا الجدول؟ سيتم إلغاء اختيار أنواع الإشراف الموجودة فيه.
            </p>
            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setTableToDelete(null)}
                className="px-5 py-2.5 rounded-xl text-sm font-bold bg-white border border-slate-300 text-slate-600 hover:bg-slate-50"
              >
                إلغاء
              </button>
              <button
                onClick={confirmRemoveTable}
                className="bg-red-500 hover:bg-red-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-md transition-all"
              >
                حذف
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SupervisionTypesPanel;
