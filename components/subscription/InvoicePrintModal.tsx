import React, { useRef } from 'react';
import { Transaction } from '../../types';
import { PACKAGE_NAMES } from './packages';
import { X, Printer } from 'lucide-react';
import { useToast } from '../ui/ToastProvider';

interface InvoicePrintModalProps {
  transaction: Transaction;
  onClose: () => void;
}

const periodLabel = (p: string) => {
  if (p === 'monthly') return 'شهري';
  if (p === 'semester') return 'فصل دراسي';
  return 'سنة دراسية';
};

const statusLabel = (s: string) => {
  if (s === 'success') return { text: 'مدفوعة', cls: 'bg-green-100 text-green-700' };
  if (s === 'failed') return { text: 'فشلت', cls: 'bg-red-100 text-red-700' };
  return { text: 'معلقة', cls: 'bg-yellow-100 text-yellow-700' };
};

const InvoicePrintModal: React.FC<InvoicePrintModalProps> = ({ transaction, onClose }) => {
  const printRef = useRef<HTMLDivElement>(null);
  const { showToast } = useToast();

  const handlePrint = () => {
    const content = printRef.current;
    if (!content) return;
    const win = window.open('', '_blank', 'width=900,height=750');
    if (!win) return;

    const html = `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8" />
  <title>فاتورة ${transaction.id} - متابع</title>
  <link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700;900&display=swap" rel="stylesheet">
  <style>
    *{margin:0;padding:0;box-sizing:border-box;}
    body{font-family:'Tajawal','Arial',sans-serif;direction:rtl;background:#fff;color:#1e293b;font-size:14px;-webkit-print-color-adjust:exact;print-color-adjust:exact;}
    @page{size:A4;margin:20mm 15mm;}
    .wrap{max-width:760px;margin:30px auto;padding:32px;border:1px solid #e2e8f0;border-radius:16px;}
    .header{display:flex;justify-content:space-between;align-items:center;padding-bottom:20px;border-bottom:2.5px solid #8779fb;margin-bottom:28px;}
    .logo-row{display:flex;align-items:center;gap:12px;}
    .logo-box{width:52px;height:52px;background:linear-gradient(135deg,#8779fb,#655ac1);border-radius:14px;display:flex;align-items:center;justify-content:center;color:#fff;font-size:22px;font-weight:900;}
    .brand{font-size:24px;font-weight:900;color:#655ac1;}
    .brand-sub{font-size:11px;color:#64748b;margin-top:2px;}
    .inv-title{font-size:20px;font-weight:900;color:#1e293b;text-align:left;}
    .inv-num{font-size:12px;color:#64748b;margin-top:4px;font-family:monospace;text-align:left;}
    .grid2{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:24px;}
    .box{background:#f8fafc;border-radius:12px;padding:14px;border:1px solid #f1f5f9;}
    .box-title{font-size:11px;font-weight:700;color:#8779fb;letter-spacing:.5px;margin-bottom:10px;padding-bottom:6px;border-bottom:1px solid #e2e8f0;}
    .row{margin-bottom:8px;}
    .lbl{font-size:11px;color:#94a3b8;font-weight:600;margin-bottom:2px;}
    .val{font-size:13px;font-weight:700;color:#1e293b;}
    .badge{display:inline-block;padding:3px 10px;border-radius:20px;font-size:11px;font-weight:700;}
    .badge-g{background:#dcfce7;color:#15803d;}
    .sec-title{font-size:11px;font-weight:700;color:#8779fb;letter-spacing:.5px;margin-bottom:10px;padding-bottom:6px;border-bottom:1px solid #f1f5f9;}
    table{width:100%;border-collapse:collapse;margin-bottom:20px;}
    th{background:#f8f7ff;padding:10px 12px;text-align:right;font-size:12px;font-weight:700;color:#655ac1;border:1px solid #e5e1fe;}
    td{padding:11px 12px;border:1px solid #f1f5f9;font-size:13px;}
    .totals{display:flex;justify-content:flex-end;margin-bottom:24px;}
    .totals-box{width:260px;}
    .tot-row{display:flex;justify-content:space-between;font-size:13px;color:#475569;margin-bottom:6px;}
    .tot-final{display:flex;justify-content:space-between;padding-top:10px;border-top:2px solid #8779fb;margin-top:10px;}
    .tot-final span:first-child{font-weight:900;font-size:14px;color:#1e293b;}
    .tot-final span:last-child{font-weight:900;font-size:20px;color:#655ac1;}
    .footer{display:flex;justify-content:space-between;align-items:center;padding-top:16px;border-top:1px solid #f1f5f9;margin-top:8px;}
    .footer-text p{font-size:11px;color:#94a3b8;margin-bottom:3px;}
    .stamp{border:2px solid #8779fb;border-radius:50%;width:72px;height:72px;display:flex;align-items:center;justify-content:center;text-align:center;font-size:9px;font-weight:900;color:#655ac1;line-height:1.4;}
  </style>
</head>
<body>
<div class="wrap">
  <div class="header">
    <div class="logo-row">
      <div class="logo-box">م</div>
      <div>
        <div class="brand">متابع</div>
        <div class="brand-sub">منصة إدارة المدارس الذكية</div>
      </div>
    </div>
    <div>
      <div class="inv-title">فاتورة ضريبية</div>
      <div class="inv-num">${transaction.id}</div>
    </div>
  </div>

  <div class="grid2">
    <div class="box">
      <div class="box-title">بيانات الفاتورة</div>
      <div class="row"><div class="lbl">رقم الفاتورة</div><div class="val" style="font-family:monospace">${transaction.id}</div></div>
      <div class="row"><div class="lbl">تاريخ الإصدار</div><div class="val">${new Date(transaction.date).toLocaleDateString('ar-SA', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })}</div></div>
      <div class="row"><div class="lbl">طريقة الدفع</div><div class="val" style="text-transform:uppercase">${transaction.paymentMethod}</div></div>
      <div class="row"><div class="lbl">الحالة</div><div class="val"><span class="badge badge-g">مدفوعة</span></div></div>
    </div>
    <div class="box">
      <div class="box-title">بيانات مزود الخدمة</div>
      <div class="row"><div class="lbl">اسم المنصة</div><div class="val">منصة متابع</div></div>
      <div class="row"><div class="lbl">الرقم الضريبي</div><div class="val" style="font-family:monospace">310123456700003</div></div>
      <div class="row"><div class="lbl">البريد الإلكتروني</div><div class="val">support@motaabe.com</div></div>
      <div class="row"><div class="lbl">الموقع</div><div class="val" style="color:#655ac1">www.motaabe.com</div></div>
    </div>
  </div>

  <div class="sec-title">تفاصيل الاشتراك</div>
  <table>
    <thead>
      <tr>
        <th>الوصف</th><th>مدة الاشتراك</th><th>المبلغ قبل الضريبة</th><th>ضريبة 15%</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><div style="font-weight:700;color:#1e293b">${PACKAGE_NAMES[transaction.packageTier]}</div><div style="font-size:11px;color:#94a3b8;margin-top:2px">اشتراك منصة متابع</div></td>
        <td style="font-weight:600">${transaction.period === 'monthly' ? 'شهري' : transaction.period === 'semester' ? 'فصل دراسي' : 'سنة دراسية'}</td>
        <td style="font-weight:700">${(transaction.amount / 1.15).toFixed(2)} ر.س</td>
        <td style="font-weight:700">${(transaction.amount - transaction.amount / 1.15).toFixed(2)} ر.س</td>
      </tr>
    </tbody>
  </table>

  <div class="totals">
    <div class="totals-box">
      <div class="tot-row"><span>المبلغ قبل الضريبة</span><span>${(transaction.amount / 1.15).toFixed(2)} ر.س</span></div>
      <div class="tot-row"><span>ضريبة القيمة المضافة (15%)</span><span>${(transaction.amount - transaction.amount / 1.15).toFixed(2)} ر.س</span></div>
      <div class="tot-final"><span>الإجمالي شامل الضريبة</span><span>${transaction.amount} ر.س</span></div>
    </div>
  </div>

  <div class="footer">
    <div class="footer-text">
      <p>هذه فاتورة ضريبية معتمدة صادرة من منصة متابع</p>
      <p>للاستفسار: support@motaabe.com | 920000000</p>
      <p>المملكة العربية السعودية - الرقم الضريبي: 310123456700003</p>
    </div>
    <div class="stamp">منصة<br/>متابع<br/>✓ معتمدة</div>
  </div>
</div>
<script>window.onload=function(){window.print();}</script>
</body></html>`;

    win.document.write(html);
    win.document.close();
    showToast('جاري فتح نافذة الطباعة...', 'info');
  };

  const txnDate = new Date(transaction.date);
  const dateStr = txnDate.toLocaleDateString('ar-SA', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' });
  const status = statusLabel(transaction.status);

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl max-h-[95vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        
        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <h2 className="text-lg font-black text-slate-800">معاينة الفاتورة</h2>
          <div className="flex items-center gap-2">
            <button onClick={handlePrint} className="flex items-center gap-2 px-4 py-2 bg-[#655ac1] text-white rounded-xl font-bold text-sm hover:bg-[#52499d] transition-colors">
              <Printer size={16} /> طباعة الفاتورة
            </button>
            <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl transition-colors text-slate-400">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Invoice Preview */}
        <div className="p-6">
          <div ref={printRef}>
            <div className="invoice-wrap border border-slate-200 rounded-2xl p-8">

              {/* Header */}
              <div className="header flex justify-between items-start pb-6 border-b-2 border-[#8779fb] mb-8">
                <div className="logo-area flex items-center gap-3">
                  <div className="logo-box w-14 h-14 rounded-2xl flex items-center justify-center text-white text-2xl font-black" style={{ background: 'linear-gradient(135deg, #8779fb, #655ac1)' }}>م</div>
                  <div>
                    <div className="brand-name text-2xl font-black text-[#655ac1]">متابع</div>
                    <div className="brand-sub text-xs text-slate-400 mt-0.5">منصة إدارة المدارس الذكية</div>
                  </div>
                </div>
                <div className="text-left">
                  <div className="text-xl font-black text-slate-800">فاتورة ضريبية</div>
                  <div className="font-mono text-sm text-slate-500 mt-1">{transaction.id}</div>
                </div>
              </div>

              {/* Info Grid */}
              <div className="grid grid-cols-2 gap-6 mb-8">
                <div className="bg-slate-50 rounded-xl p-4 space-y-3">
                  <div className="text-xs font-bold text-[#8779fb] uppercase tracking-wider mb-2 pb-2 border-b border-slate-200">بيانات الفاتورة</div>
                  <div>
                    <div className="text-xs text-slate-400 font-semibold mb-0.5">رقم الفاتورة</div>
                    <div className="font-mono font-bold text-slate-800">{transaction.id}</div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-400 font-semibold mb-0.5">تاريخ الإصدار</div>
                    <div className="font-bold text-slate-800 text-sm">{dateStr}</div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-400 font-semibold mb-0.5">طريقة الدفع</div>
                    <div className="font-bold text-slate-800 uppercase">{transaction.paymentMethod}</div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-400 font-semibold mb-0.5">الحالة</div>
                    <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${status.cls}`}>{status.text}</span>
                  </div>
                </div>

                <div className="bg-slate-50 rounded-xl p-4 space-y-3">
                  <div className="text-xs font-bold text-[#8779fb] uppercase tracking-wider mb-2 pb-2 border-b border-slate-200">بيانات مزود الخدمة</div>
                  <div>
                    <div className="text-xs text-slate-400 font-semibold mb-0.5">اسم المنصة</div>
                    <div className="font-bold text-slate-800">منصة متابع</div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-400 font-semibold mb-0.5">الرقم الضريبي</div>
                    <div className="font-mono font-bold text-slate-800">310123456700003</div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-400 font-semibold mb-0.5">البريد الإلكتروني</div>
                    <div className="font-bold text-slate-800">support@motaabe.com</div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-400 font-semibold mb-0.5">الموقع الإلكتروني</div>
                    <div className="font-bold text-[#655ac1]">www.motaabe.com</div>
                  </div>
                </div>
              </div>

              {/* Items Table */}
              <div className="mb-6">
                <div className="text-xs font-bold text-[#8779fb] uppercase tracking-wider mb-3 pb-2 border-b border-slate-100">تفاصيل الاشتراك</div>
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-[#f8f7ff]">
                      <th className="p-3 text-right text-xs font-bold text-[#655ac1] border border-[#e5e1fe] rounded-r">الوصف</th>
                      <th className="p-3 text-right text-xs font-bold text-[#655ac1] border border-[#e5e1fe]">مدة الاشتراك</th>
                      <th className="p-3 text-right text-xs font-bold text-[#655ac1] border border-[#e5e1fe]">المبلغ</th>
                      <th className="p-3 text-right text-xs font-bold text-[#655ac1] border border-[#e5e1fe] rounded-l">الضريبة (15%)</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-slate-100">
                      <td className="p-3 border border-slate-100">
                        <div className="font-bold text-slate-800">{PACKAGE_NAMES[transaction.packageTier]}</div>
                        <div className="text-xs text-slate-400 mt-0.5">اشتراك منصة متابع</div>
                      </td>
                      <td className="p-3 border border-slate-100 text-slate-700 font-medium">{periodLabel(transaction.period)}</td>
                      <td className="p-3 border border-slate-100 font-bold text-slate-800">{(transaction.amount / 1.15).toFixed(2)} ر.س</td>
                      <td className="p-3 border border-slate-100 font-bold text-slate-800">{(transaction.amount - transaction.amount / 1.15).toFixed(2)} ر.س</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Totals */}
              <div className="flex justify-end mb-8">
                <div className="w-64 space-y-2">
                  <div className="flex justify-between text-sm text-slate-600">
                    <span className="font-semibold">المبلغ قبل الضريبة</span>
                    <span className="font-bold">{(transaction.amount / 1.15).toFixed(2)} ر.س</span>
                  </div>
                  <div className="flex justify-between text-sm text-slate-600">
                    <span className="font-semibold">ضريبة القيمة المضافة (15%)</span>
                    <span className="font-bold">{(transaction.amount - transaction.amount / 1.15).toFixed(2)} ر.س</span>
                  </div>
                  <div className="flex justify-between pt-3 border-t-2 border-[#8779fb]">
                    <span className="font-black text-slate-800 text-base">الإجمالي شامل الضريبة</span>
                    <span className="font-black text-[#655ac1] text-xl">{transaction.amount} ر.س</span>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-end justify-between pt-6 border-t border-slate-100">
                <div className="space-y-1">
                  <p className="text-xs text-slate-400 font-semibold">هذه فاتورة ضريبية معتمدة صادرة من منصة متابع</p>
                  <p className="text-xs text-slate-400">للاستفسار: support@motaabe.com | 920000000</p>
                  <p className="text-xs text-slate-400">المملكة العربية السعودية - الرقم الضريبي: 310123456700003</p>
                </div>
                <div className="border-2 border-[#8779fb] rounded-full w-20 h-20 flex items-center justify-center text-center">
                  <div className="text-[9px] font-black text-[#655ac1] leading-tight">منصة<br/>متابع<br/>✓ معتمدة</div>
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InvoicePrintModal;
