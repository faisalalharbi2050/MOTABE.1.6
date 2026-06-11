import React, { useState } from 'react';
import { Transaction } from '../../types';
import { PACKAGE_NAMES } from './packages';
import { Download, Printer, FileText, Receipt, SaudiRiyal } from 'lucide-react';
import InvoicePrintModal from './InvoicePrintModal';

interface InvoiceListProps {
  transactions: Transaction[];
}

const periodLabel = (p: string) => (p === 'monthly' ? 'شهر' : p === 'semester' ? 'فصل دراسي' : 'سنة دراسية');

const STATUS_META: Record<string, { text: string; cls: string }> = {
  success: { text: 'ناجحة', cls: 'bg-green-100 text-green-700' },
  failed: { text: 'فشلت', cls: 'bg-red-100 text-red-700' },
  pending: { text: 'معلقة', cls: 'bg-yellow-100 text-yellow-700' },
};

const InvoiceList: React.FC<InvoiceListProps> = ({ transactions }) => {
  const [printingTxn, setPrintingTxn] = useState<Transaction | null>(null);

  const mockTransactions: Transaction[] = [
    { id: 'TXN-2025-0001', date: '2025-09-01', packageTier: 'basic', period: 'semester', amount: 194, status: 'success', paymentMethod: 'visa' },
    { id: 'TXN-2025-0002', date: '2025-09-15', packageTier: 'advanced', period: 'semester', amount: 299, status: 'success', paymentMethod: 'mada' },
    { id: 'TXN-2025-0003', date: '2025-10-01', packageTier: 'basic', period: 'monthly', amount: 89, status: 'failed', paymentMethod: 'visa' },
    { id: 'TXN-2025-0004', date: '2025-11-01', packageTier: 'basic', period: 'monthly', amount: 89, status: 'success', paymentMethod: 'mada' },
    { id: 'TXN-2025-0005', date: '2026-01-15', packageTier: 'advanced', period: 'yearly', amount: 599, status: 'pending', paymentMethod: 'mastercard' },
  ];

  const displayedTransactions = transactions && transactions.length > 0 ? transactions : mockTransactions;

  const fmtDay = (d: string) => new Date(d).toLocaleDateString('ar-SA', { weekday: 'long' });
  const fmtDate = (d: string) => new Date(d).toLocaleDateString('ar-SA');

  const renderActions = (txn: Transaction) =>
    txn.status === 'success' ? (
      <div className="flex items-center gap-2">
        <button
          onClick={() => setPrintingTxn(txn)}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition-colors hover:border-[#655ac1]/40 hover:text-[#655ac1]"
          title="طباعة الفاتورة"
        >
          <Printer size={17} />
        </button>
        <button
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition-colors hover:border-[#655ac1]/40 hover:text-[#655ac1]"
          title="تصدير PDF"
        >
          <Download size={17} />
        </button>
      </div>
    ) : (
      <span className="text-xs text-slate-300">—</span>
    );

  return (
    <>
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <div className="flex items-center gap-2">
            <FileText size={18} className="text-[#655ac1]" />
            <h4 className="text-base font-black text-slate-800">سجل العمليات والفواتير</h4>
            <span className="mr-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-sm font-black text-[#655ac1]">
              {displayedTransactions.length}
            </span>
          </div>
        </div>

        {/* Mobile cards */}
        <div className="space-y-3 p-3 md:hidden">
          {displayedTransactions.map((txn, index) => {
            const status = STATUS_META[txn.status];
            return (
              <div key={txn.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-50 text-xs font-bold text-slate-400">
                    {index + 1}
                  </span>
                  <span className="font-mono text-[12px] font-bold text-slate-500">{txn.id}</span>
                  <span className={`mr-auto rounded-full px-3 py-1 text-[11px] font-bold ${status.cls}`}>{status.text}</span>
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <div>
                    <p className="text-[13px] font-black text-slate-800">{PACKAGE_NAMES[txn.packageTier]}</p>
                    <p className="mt-0.5 text-[11px] font-bold text-slate-400">
                      {periodLabel(txn.period)} · {txn.paymentMethod.toUpperCase()}
                    </p>
                  </div>
                  <span className="inline-flex items-center gap-1 text-[15px] font-black text-slate-800">{txn.amount}<SaudiRiyal size={14} strokeWidth={2.25} /></span>
                </div>
                <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3">
                  <span className="text-[12px] font-bold text-slate-500">{fmtDay(txn.date)} · {fmtDate(txn.date)}</span>
                  {renderActions(txn)}
                </div>
              </div>
            );
          })}
        </div>

        {/* Desktop table */}
        <div className="hidden p-4 md:block">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] table-fixed border-separate border-spacing-0 overflow-hidden rounded-2xl border border-slate-100 text-right">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/80">
                  <th className="w-12 px-3 py-4 text-center text-xs font-black text-[#655ac1]">م</th>
                  <th className="w-[16%] px-3 py-4 text-xs font-black text-[#655ac1]">رقم العملية</th>
                  <th className="w-[10%] px-3 py-4 text-center text-xs font-black text-[#655ac1]">اليوم</th>
                  <th className="w-[12%] px-3 py-4 text-center text-xs font-black text-[#655ac1]">التاريخ</th>
                  <th className="w-[24%] px-3 py-4 text-xs font-black text-[#655ac1]">التفاصيل</th>
                  <th className="w-[12%] px-3 py-4 text-center text-xs font-black text-[#655ac1]">المبلغ</th>
                  <th className="w-[11%] px-3 py-4 text-center text-xs font-black text-[#655ac1]">الحالة</th>
                  <th className="w-[10%] px-3 py-4 text-center text-xs font-black text-[#655ac1]">إجراءات</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-50">
                {displayedTransactions.map((txn, index) => {
                  const status = STATUS_META[txn.status];
                  return (
                    <tr key={txn.id} className="transition-colors hover:bg-[#e5e1fe]/10">
                      <td className="px-3 py-3.5 text-center">
                        <span className="mx-auto flex h-6 w-6 items-center justify-center rounded-full bg-slate-50 text-xs font-bold text-slate-400">
                          {index + 1}
                        </span>
                      </td>
                      <td className="px-3 py-3.5 align-middle">
                        <span className="font-mono text-[13px] font-bold text-slate-500">{txn.id}</span>
                      </td>
                      <td className="px-3 py-3.5 text-center align-middle">
                        <span className="text-[13px] font-bold text-slate-600">{fmtDay(txn.date)}</span>
                      </td>
                      <td className="px-3 py-3.5 text-center align-middle">
                        <span className="text-[13px] font-bold text-slate-600">{fmtDate(txn.date)}</span>
                      </td>
                      <td className="px-3 py-3.5 align-middle">
                        <p className="text-[14px] font-black text-slate-800">{PACKAGE_NAMES[txn.packageTier]}</p>
                        <p className="mt-0.5 text-[12px] font-bold text-slate-400">
                          {periodLabel(txn.period)} · {txn.paymentMethod.toUpperCase()}
                        </p>
                      </td>
                      <td className="px-3 py-3.5 text-center align-middle">
                        <span className="inline-flex items-center justify-center gap-1 text-[14px] font-black text-slate-800">{txn.amount}<SaudiRiyal size={14} strokeWidth={2.25} /></span>
                      </td>
                      <td className="px-3 py-3.5 text-center align-middle">
                        <span className={`inline-block rounded-full px-3 py-1 text-[12px] font-bold ${status.cls}`}>{status.text}</span>
                      </td>
                      <td className="px-3 py-3.5 align-middle">
                        <div className="flex justify-center">{renderActions(txn)}</div>
                      </td>
                    </tr>
                  );
                })}

                {displayedTransactions.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-6 py-16">
                      <div className="text-center">
                        <Receipt size={32} className="mx-auto mb-3 text-slate-300" />
                        <p className="text-sm font-bold text-slate-400">لا توجد عمليات أو فواتير بعد.</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {printingTxn && (
        <InvoicePrintModal
          transaction={printingTxn}
          onClose={() => setPrintingTxn(null)}
        />
      )}
    </>
  );
};

export default InvoiceList;
