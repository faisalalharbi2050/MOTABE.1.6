import React, { useState } from 'react';
import { Transaction } from '../../types';
import { PACKAGE_NAMES } from './packages';
import { Download, Printer, FileText } from 'lucide-react';
import InvoicePrintModal from './InvoicePrintModal';

interface InvoiceListProps {
  transactions: Transaction[];
}

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

  return (
    <>
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-100">
          <h3 className="text-lg font-bold text-slate-800">سجل العمليات والفواتير</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-right text-slate-600">
            <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
              <tr>
                <th className="p-4 px-6 text-sm">رقم العملية</th>
                <th className="p-4 px-6 text-sm">التاريخ</th>
                <th className="p-4 px-6 text-sm">التفاصيل</th>
                <th className="p-4 px-6 text-sm">المبلغ</th>
                <th className="p-4 px-6 text-sm">الحالة</th>
                <th className="p-4 px-6 text-sm">إجراء</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {displayedTransactions.map(txn => (
                <tr key={txn.id} className="hover:bg-slate-50 transition-colors">
                  <td className="p-4 px-6 font-mono text-sm">{txn.id}</td>
                  <td className="p-4 px-6 text-sm">
                    <div className="text-xs text-slate-400 mb-0.5">{new Date(txn.date).toLocaleDateString('ar-SA', { weekday: 'long' })}</div>
                    <div>{new Date(txn.date).toLocaleDateString('ar-SA')}</div>
                  </td>
                  <td className="p-4 px-6">
                    <div className="font-bold text-slate-800">{PACKAGE_NAMES[txn.packageTier]}</div>
                    <div className="text-xs text-slate-500">{txn.period === 'monthly' ? 'شهر' : txn.period === 'semester' ? 'فصل دراسي' : 'سنة دراسية'} - {txn.paymentMethod.toUpperCase()}</div>
                  </td>
                  <td className="p-4 px-6 font-bold text-slate-800">{txn.amount} ر.س</td>
                  <td className="p-4 px-6">
                    {txn.status === 'success' && <span className="inline-block px-3 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-full">ناجحة</span>}
                    {txn.status === 'failed' && <span className="inline-block px-3 py-1 bg-red-100 text-red-700 text-xs font-bold rounded-full">فشلت</span>}
                    {txn.status === 'pending' && <span className="inline-block px-3 py-1 bg-yellow-100 text-yellow-700 text-xs font-bold rounded-full">معلقة</span>}
                  </td>
                  <td className="p-4 px-6">
                    {txn.status === 'success' && (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setPrintingTxn(txn)}
                          className="p-2 text-slate-400 hover:text-[#655ac1] hover:bg-slate-100 rounded-lg transition-colors"
                          title="طباعة الفاتورة"
                        >
                          <Printer size={18} />
                        </button>
                        <button className="p-2 text-slate-400 hover:text-green-600 hover:bg-slate-100 rounded-lg transition-colors" title="تحميل PDF">
                          <Download size={18} />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
