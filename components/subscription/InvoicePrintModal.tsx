import React, { useRef } from 'react';
import { createPortal } from 'react-dom';
import { Transaction } from '../../types';
import { PACKAGE_NAMES } from './packages';
import { X, Printer, Download, SaudiRiyal } from 'lucide-react';
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
  if (s === 'success') return { text: 'مدفوعة', cls: 'bg-emerald-50 text-emerald-700 border border-emerald-200' };
  if (s === 'failed') return { text: 'فشلت', cls: 'bg-red-50 text-red-700 border border-red-200' };
  return { text: 'معلقة', cls: 'bg-amber-50 text-amber-700 border border-amber-200' };
};

/* Amount followed by the new Saudi Riyal symbol. */
const Money: React.FC<{ value: string | number; className?: string; size?: number }> = ({ value, className = '', size = 13 }) => (
  <span className={`inline-flex items-center gap-1 ${className}`}>
    {value}
    <SaudiRiyal size={size} className="shrink-0" strokeWidth={2.25} />
  </span>
);

const InvoicePrintModal: React.FC<InvoicePrintModalProps> = ({ transaction, onClose }) => {
  const printRef = useRef<HTMLDivElement>(null);
  const { showToast } = useToast();

  const net = transaction.amount / 1.15;
  const vat = transaction.amount - net;
  const logoUrl = `${window.location.origin}/logo.png`;

  const txnDate = new Date(transaction.date);
  // Numeric (digit-month) dates — Hijri primary, Gregorian secondary.
  const hijriDate = txnDate.toLocaleDateString('ar-SA-u-ca-islamic-umalqura', { year: 'numeric', month: '2-digit', day: '2-digit' });
  const gregDate = txnDate.toLocaleDateString('ar-SA-u-ca-gregory', { year: 'numeric', month: '2-digit', day: '2-digit' });

  // Inline Saudi Riyal symbol for the print document (lucide path data).
  const riyal = (size = 13) =>
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:-1px;margin-right:3px"><path d="m20 19.5-5.5 1.2"/><path d="M14.5 4v11.22a1 1 0 0 0 1.242.97L20 15.2"/><path d="m2.978 19.351 5.549-1.363A2 2 0 0 0 10 16V2"/><path d="M20 10 4 13.5"/></svg>`;
  const money = (v: string | number, size = 13) => `<span style="display:inline-flex;align-items:center;direction:ltr">${v}${riyal(size)}</span>`;

  const handlePrint = () => {
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
    body{font-family:'Tajawal','Arial',sans-serif;direction:rtl;background:#f1f5f9;color:#0f172a;font-size:14px;-webkit-print-color-adjust:exact;print-color-adjust:exact;}
    @page{size:A4;margin:0;}
    .wrap{max-width:780px;margin:24px auto;background:#fff;border-radius:16px;overflow:hidden;border:1px solid #e2e8f0;box-shadow:0 8px 30px rgba(15,23,42,.06);}
    .pad{padding:38px 40px;}
    .head{display:flex;justify-content:space-between;align-items:flex-start;padding-bottom:26px;border-bottom:2px solid #0f172a;}
    .logo-row{display:flex;align-items:center;gap:14px;}
    .logo-box{width:60px;height:60px;border:1px solid #e2e8f0;border-radius:14px;display:flex;align-items:center;justify-content:center;padding:9px;}
    .logo-box img{width:100%;height:100%;object-fit:contain;}
    .brand{font-size:20px;font-weight:900;color:#0f172a;}
    .brand-sub{font-size:11px;color:#94a3b8;margin-top:3px;}
    .inv-meta{text-align:left;}
    .inv-title{font-size:30px;font-weight:900;color:#0f172a;letter-spacing:1px;}
    .inv-line{font-size:12px;color:#64748b;margin-top:8px;}
    .inv-line b{color:#0f172a;font-family:monospace;font-weight:700;}
    .parties{display:grid;grid-template-columns:1fr 1fr;gap:28px;margin:28px 0;}
    .p-title{font-size:11px;font-weight:900;color:#0f172a;letter-spacing:1px;margin-bottom:12px;}
    .p-row{display:flex;justify-content:space-between;gap:12px;margin-bottom:8px;font-size:12.5px;}
    .p-row .k{color:#0f172a;font-weight:700;}
    .p-row .v{color:#655ac1;font-weight:700;}
    .badge{display:inline-block;padding:2px 10px;border-radius:6px;font-size:11px;font-weight:700;background:#ecfdf5;color:#047857;border:1px solid #a7f3d0;}
    table{width:100%;border-collapse:collapse;margin-bottom:24px;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;}
    thead th{background:#f8fafc;padding:13px 16px;text-align:right;font-size:11.5px;font-weight:900;color:#475569;border-bottom:1px solid #e2e8f0;}
    thead th:last-child,tbody td:last-child{text-align:left;}
    tbody td{padding:16px;font-size:13px;vertical-align:top;}
    .desc-main{font-weight:900;color:#0f172a;}
    .desc-sub{font-size:11px;color:#94a3b8;margin-top:3px;}
    .totals{display:flex;justify-content:flex-end;}
    .totals-box{width:320px;}
    .t-row{display:flex;justify-content:space-between;padding:9px 0;font-size:13px;color:#475569;border-bottom:1px solid #f1f5f9;}
    .t-row .v{font-weight:700;color:#0f172a;}
    .t-final{display:flex;justify-content:space-between;align-items:center;border:1.5px solid #cbd5e1;color:#0f172a;padding:15px 18px;border-radius:12px;margin-top:14px;}
    .t-final .l{font-size:14px;font-weight:900;}
    .t-final .v{font-size:20px;font-weight:900;}
    .foot{display:flex;justify-content:space-between;align-items:flex-end;margin-top:34px;padding-top:22px;border-top:1px solid #f1f5f9;}
    .foot p{font-size:11px;color:#94a3b8;margin-bottom:5px;}
    .stamp{border:1.5px solid #cbd5e1;border-radius:50%;width:76px;height:76px;display:flex;align-items:center;justify-content:center;text-align:center;font-size:9px;font-weight:900;color:#64748b;line-height:1.5;}
  </style>
</head>
<body>
<div class="wrap"><div class="pad">
  <div class="head">
    <div>
      <div class="inv-title">فاتورة</div>
      <div class="logo-row" style="margin-top:16px">
        <div class="logo-box"><img src="${logoUrl}" alt="متابع" /></div>
        <div>
          <div class="brand">مؤسسة متابع التقنية</div>
        </div>
      </div>
    </div>
    <div class="inv-meta">
      <div class="inv-line">رقم الفاتورة: <b>${transaction.id}</b></div>
      <div class="inv-line" style="margin-top:3px">تاريخ الإصدار: <b>${hijriDate}</b></div>
      <div class="inv-line" style="margin-top:3px">الموافق: <b>${gregDate}</b></div>
    </div>
  </div>

  <div class="parties">
    <div>
      <div class="p-title">بيانات مزود الخدمة</div>
      <div class="p-row"><span class="k">اسم المؤسسة</span><span class="v">مؤسسة متابع التقنية</span></div>
      <div class="p-row"><span class="k">الرقم الضريبي</span><span class="v" style="font-family:monospace">310123456700003</span></div>
      <div class="p-row"><span class="k">البريد الإلكتروني</span><span class="v">support@motaabe.com</span></div>
      <div class="p-row"><span class="k">الموقع</span><span class="v">www.motaabe.com</span></div>
    </div>
    <div>
      <div class="p-title">تفاصيل الدفع</div>
      <div class="p-row"><span class="k">طريقة الدفع</span><span class="v" style="text-transform:uppercase">${transaction.paymentMethod}</span></div>
      <div class="p-row"><span class="k">مدة الاشتراك</span><span class="v">${periodLabel(transaction.period)}</span></div>
      <div class="p-row"><span class="k">الباقة</span><span class="v">${PACKAGE_NAMES[transaction.packageTier]}</span></div>
      <div class="p-row"><span class="k">الحالة</span><span class="badge">مدفوعة</span></div>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>الوصف</th><th>الكمية</th><th>السعر</th><th>الإجمالي</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><div class="desc-main">${PACKAGE_NAMES[transaction.packageTier]}</div><div class="desc-sub">اشتراك منصة متابع · ${periodLabel(transaction.period)}</div></td>
        <td>1</td>
        <td>${money(net.toFixed(2))}</td>
        <td style="font-weight:900">${money(net.toFixed(2))}</td>
      </tr>
    </tbody>
  </table>

  <div class="totals">
    <div class="totals-box">
      <div class="t-row"><span>المجموع الفرعي</span><span class="v">${money(net.toFixed(2))}</span></div>
      <div class="t-row"><span>ضريبة القيمة المضافة (15%)</span><span class="v">${money(vat.toFixed(2))}</span></div>
      <div class="t-final"><span class="l">الإجمالي المستحق</span><span class="v">${money(String(transaction.amount), 18)}</span></div>
    </div>
  </div>

  <div class="foot">
    <div>
      <p>للاستفسار: support@motaabe.com · 920000000</p>
      <p>المملكة العربية السعودية · الرقم الضريبي 310123456700003</p>
      <p>السجل التجاري رقم 1010234567</p>
    </div>
    <div class="stamp">مؤسسة<br/>متابع<br/>✓ معتمدة</div>
  </div>
</div></div>
<script>window.onload=function(){setTimeout(function(){window.print();},350);}</script>
</body></html>`;

    win.document.write(html);
    win.document.close();
    showToast('جاري فتح نافذة الطباعة...', 'info');
  };

  const status = statusLabel(transaction.status);

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-3 backdrop-blur-sm" style={{ direction: 'rtl' }} onClick={onClose}>
      <div
        className="flex h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-[2rem] border border-slate-200 bg-slate-100 shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Window header */}
        <div className="flex shrink-0 items-center justify-between border-b border-slate-200 bg-white px-6 py-3.5">
          <h2 className="text-base font-black text-slate-800">معاينة الفاتورة</h2>
          <button onClick={onClose} className="rounded-full border border-slate-200 bg-white p-2 text-slate-400 transition-colors hover:bg-slate-50 hover:text-slate-600">
            <X size={18} />
          </button>
        </div>

        {/* Scrollable invoice paper */}
        <div className="custom-scrollbar flex-1 overflow-y-auto p-6">
          <div ref={printRef} className="mx-auto max-w-2xl rounded-2xl border border-slate-200 bg-white p-9 shadow-sm">

            {/* Header */}
            <div className="flex items-start justify-between border-b-2 border-slate-900 pb-6">
              <div className="text-right">
                <div className="text-3xl font-black tracking-wide text-slate-900">فاتورة</div>
                <div className="mt-4 flex items-center gap-3.5">
                  <div className="flex h-14 w-14 items-center justify-center rounded-xl border border-slate-200 p-2">
                    <img src="/logo.png" alt="متابع" className="h-full w-full object-contain" />
                  </div>
                  <div className="text-lg font-black leading-tight text-slate-900">مؤسسة متابع التقنية</div>
                </div>
              </div>
              <div className="text-left">
                <div className="text-[12px] text-slate-500">رقم الفاتورة: <span className="font-mono font-bold text-slate-800">{transaction.id}</span></div>
                <div className="mt-1 text-[12px] text-slate-500">تاريخ الإصدار: <span className="font-bold text-slate-800">{hijriDate}</span></div>
                <div className="mt-0.5 text-[12px] text-slate-500">الموافق: <span className="font-bold text-slate-800">{gregDate}</span></div>
              </div>
            </div>

            {/* Parties */}
            <div className="my-7 grid grid-cols-2 gap-8">
              <div>
                <div className="mb-3 text-[11px] font-black tracking-wider text-slate-900">بيانات مزود الخدمة</div>
                <div className="space-y-2">
                  <div className="flex justify-between gap-3 text-[12.5px]"><span className="font-bold text-slate-900">اسم المؤسسة</span><span className="font-bold text-[#655ac1]">مؤسسة متابع التقنية</span></div>
                  <div className="flex justify-between gap-3 text-[12.5px]"><span className="font-bold text-slate-900">الرقم الضريبي</span><span className="font-mono font-bold text-[#655ac1]">310123456700003</span></div>
                  <div className="flex justify-between gap-3 text-[12.5px]"><span className="font-bold text-slate-900">البريد الإلكتروني</span><span className="font-bold text-[#655ac1]">support@motaabe.com</span></div>
                  <div className="flex justify-between gap-3 text-[12.5px]"><span className="font-bold text-slate-900">الموقع</span><span className="font-bold text-[#655ac1]">www.motaabe.com</span></div>
                </div>
              </div>
              <div>
                <div className="mb-3 text-[11px] font-black tracking-wider text-slate-900">تفاصيل الدفع</div>
                <div className="space-y-2">
                  <div className="flex justify-between gap-3 text-[12.5px]"><span className="font-bold text-slate-900">طريقة الدفع</span><span className="font-bold uppercase text-[#655ac1]">{transaction.paymentMethod}</span></div>
                  <div className="flex justify-between gap-3 text-[12.5px]"><span className="font-bold text-slate-900">مدة الاشتراك</span><span className="font-bold text-[#655ac1]">{periodLabel(transaction.period)}</span></div>
                  <div className="flex justify-between gap-3 text-[12.5px]"><span className="font-bold text-slate-900">الباقة</span><span className="font-bold text-[#655ac1]">{PACKAGE_NAMES[transaction.packageTier]}</span></div>
                  <div className="flex justify-between gap-3 text-[12.5px]"><span className="font-bold text-slate-900">الحالة</span><span className={`rounded-md px-2.5 py-0.5 text-[11px] font-bold ${status.cls}`}>{status.text}</span></div>
                </div>
              </div>
            </div>

            {/* Items Table */}
            <div className="overflow-hidden rounded-xl border border-slate-200">
              <table className="w-full border-collapse text-right">
                <thead>
                  <tr className="bg-slate-50">
                    <th className="border-b border-slate-200 px-4 py-3 text-[11.5px] font-black text-slate-500">الوصف</th>
                    <th className="border-b border-slate-200 px-4 py-3 text-[11.5px] font-black text-slate-500">الكمية</th>
                    <th className="border-b border-slate-200 px-4 py-3 text-[11.5px] font-black text-slate-500">السعر</th>
                    <th className="border-b border-slate-200 px-4 py-3 text-left text-[11.5px] font-black text-slate-500">الإجمالي</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="px-4 py-4 align-top">
                      <div className="text-[13px] font-black text-slate-900">{PACKAGE_NAMES[transaction.packageTier]}</div>
                      <div className="mt-0.5 text-[11px] text-slate-400">اشتراك منصة متابع · {periodLabel(transaction.period)}</div>
                    </td>
                    <td className="px-4 py-4 align-top text-[13px] font-bold text-slate-700">1</td>
                    <td className="px-4 py-4 align-top text-[13px] font-bold text-slate-700"><Money value={net.toFixed(2)} /></td>
                    <td className="px-4 py-4 text-left align-top text-[13px] font-black text-slate-900"><Money value={net.toFixed(2)} /></td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Totals */}
            <div className="mt-6 flex justify-end">
              <div className="w-80">
                <div className="flex justify-between border-b border-slate-100 py-2.5 text-[13px] text-slate-500">
                  <span>المجموع الفرعي</span>
                  <Money value={net.toFixed(2)} className="font-bold text-slate-800" />
                </div>
                <div className="flex justify-between border-b border-slate-100 py-2.5 text-[13px] text-slate-500">
                  <span>ضريبة القيمة المضافة (15%)</span>
                  <Money value={vat.toFixed(2)} className="font-bold text-slate-800" />
                </div>
                <div className="mt-3.5 flex items-center justify-between rounded-xl border-[1.5px] border-slate-300 px-5 py-3.5 text-slate-900">
                  <span className="text-sm font-black">الإجمالي المستحق</span>
                  <Money value={transaction.amount} size={18} className="text-xl font-black" />
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="mt-9 flex items-end justify-between border-t border-slate-100 pt-6">
              <div className="space-y-1.5">
                <p className="text-[11px] text-slate-400">للاستفسار: support@motaabe.com · 920000000</p>
                <p className="text-[11px] text-slate-400">المملكة العربية السعودية · الرقم الضريبي 310123456700003</p>
                <p className="text-[11px] text-slate-400">السجل التجاري رقم 1010234567</p>
              </div>
              <div className="flex h-[76px] w-[76px] items-center justify-center rounded-full border-[1.5px] border-slate-300 text-center">
                <div className="text-[9px] font-black leading-snug text-slate-500">مؤسسة<br/>متابع<br/>✓ معتمدة</div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <div className="flex shrink-0 items-center justify-between gap-2 border-t border-slate-200 bg-white px-6 py-3.5">
          <button
            onClick={onClose}
            className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-[13px] font-bold text-slate-600 transition-colors hover:bg-slate-50"
          >
            إغلاق
          </button>
          <div className="flex items-center gap-2">
            <button
              className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-[13px] font-bold text-slate-600 transition-colors hover:bg-slate-50"
            >
              <Download size={15} /> تصدير PDF
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 rounded-xl bg-[#655ac1] px-5 py-2.5 text-[13px] font-bold text-white transition-colors hover:bg-[#52499d]"
            >
              <Printer size={15} /> طباعة
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
};

export default InvoicePrintModal;
