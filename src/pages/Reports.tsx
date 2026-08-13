import { useMemo, useState } from 'react';
import { useApp } from '../store/AppContext';
import { formatCurrency, formatDate } from '../lib/utils';
import { Download, FileSpreadsheet, FileText, Calendar, X } from 'lucide-react';
import { exportToJSON } from '../db/storage';

function exportExcel(rows: (string | number)[][], sheetName: string, fileName: string) {
  import('xlsx').then(XLSX => {
    const ws = XLSX.utils.aoa_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
    XLSX.writeFile(wb, fileName);
  });
}

async function exportPdf(
  title: string,
  headers: string[],
  rows: (string | number)[][],
  fileName: string,
  companyName?: string,
  companyPhone?: string,
  companyAddress?: string,
  companyLogo?: string
) {
  const { exportArabicTablePdf } = await import('../lib/pdf');
  await exportArabicTablePdf({
    title,
    headers,
    rows,
    fileName,
    companyName,
    companyPhone,
    companyAddress,
    companyLogo
  });
}

export default function Reports() {
  const { data } = useApp();
  const companyName = data.settings?.name;
  const companyPhone = data.settings?.phone;
  const companyAddress = data.settings?.address;
  const companyLogo = data.settings?.logo;

  // فلتر الفترة الزمنية — يؤثر على كل التقارير المعروضة في هذه الصفحة (فيما عدا
  // تقرير المخزون الحالي، لأنه لقطة لحظية للرصيد الحالي وليس حركة زمنية)
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const hasDateFilter = !!(fromDate || toDate);

  const inRange = (d: string) => (!fromDate || d >= fromDate) && (!toDate || d <= toDate);

  const filteredInvoices = useMemo(() => data.invoices.filter(i => inRange(i.date)), [data.invoices, fromDate, toDate]);
  const filteredCollections = useMemo(() => data.collections.filter(c => inRange(c.date)), [data.collections, fromDate, toDate]);
  const filteredReturns = useMemo(() => data.returns.filter(r => inRange(r.date)), [data.returns, fromDate, toDate]);
  const filteredRepReturns = useMemo(() => (data.representativeReturns || []).filter(r => inRange(r.date)), [data.representativeReturns, fromDate, toDate]);
  const filteredMovements = useMemo(() => (data.stockMovements || []).filter(m => inRange(m.date)), [data.stockMovements, fromDate, toDate]);

  const totalSales = filteredInvoices.reduce((s, i) => s + i.total, 0);
  // صافي التحصيلات بعد خصم أي مبالغ استُرِدَّت نقداً للعملاء عند مرتجعاتهم
  const totalRefundsToCustomers = filteredReturns.reduce((s, r) => s + (r.refundAmount || 0), 0);
  const totalCollections = filteredCollections.reduce((s, c) => s + c.amount, 0) - totalRefundsToCustomers;
  const totalReturns = filteredReturns.reduce((s, r) => s + r.total, 0);
  const totalRepReturns = filteredRepReturns.reduce((s, r) => s + r.totalValue, 0);
  const totalCost = filteredInvoices.reduce((s, inv) => {
    return s + inv.items.reduce((is, item) => {
      if (item.costAtSale != null) return is + item.costAtSale * item.quantity;
      const product = data.products.find(p => p.id === item.productId);
      return is + (product ? product.purchasePrice * item.quantity : 0);
    }, 0);
  }, 0);
  const returnsCost = filteredReturns.reduce((s, r) => {
    if (r.totalCost != null) return s + r.totalCost;
    return s + r.items.reduce((is, item) => is + ((item as any).costAtSale || 0) * item.quantity, 0);
  }, 0);
  const netProfit = totalSales - totalCost - totalReturns + returnsCost;

  const handleExportJSON = () => {
    const blob = new Blob([exportToJSON()], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `agri-plus-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const salesRows = filteredInvoices.map(inv => [
    inv.number, inv.customerName, inv.date, inv.subtotal, inv.discount, inv.total
  ]);

  const exportSalesExcel = () => {
    exportExcel(
      [['رقم الفاتورة', 'العميل', 'التاريخ', 'المجموع', 'الخصم', 'الصافي'], ...salesRows],
      'المبيعات',
      `sales-${new Date().toISOString().slice(0, 10)}.xlsx`
    );
  };

  const exportSalesPdf = () => {
    exportPdf(
      'تقرير المبيعات',
      ['رقم الفاتورة', 'العميل', 'التاريخ', 'المجموع', 'الخصم', 'الصافي'],
      salesRows,
      `sales-${new Date().toISOString().slice(0, 10)}.pdf`,
      companyName,
      companyPhone,
      companyAddress,
      companyLogo
    );
  };

  const stockRows = data.products.map(p => [
    p.name, p.tradeName, p.currentStock, p.minStock, p.purchasePrice, p.salePrice,
    p.currentStock <= p.minStock ? 'منخفض' : 'طبيعي'
  ]);

  const exportStockExcel = () => {
    exportExcel(
      [['الصنف', 'التجاري', 'المخزون', 'الحد الأدنى', 'شراء', 'بيع', 'الحالة'], ...stockRows],
      'المخزون',
      `stock-${new Date().toISOString().slice(0, 10)}.xlsx`
    );
  };

  const movementsRows = filteredMovements.slice(0, 500).map(m => [
    m.date, m.productName, m.type, m.quantity, m.reference, m.notes
  ]);

  const exportMovementsExcel = () => {
    exportExcel(
      [['التاريخ', 'الصنف', 'النوع', 'الكمية', 'المرجع', 'ملاحظات'], ...movementsRows],
      'حركة المخزون',
      `movements-${new Date().toISOString().slice(0, 10)}.xlsx`
    );
  };

  const exportMovementsPdf = () => {
    exportPdf(
      'كشف حركة المخزون',
      ['التاريخ', 'الصنف', 'النوع', 'الكمية', 'المرجع', 'ملاحظات'],
      movementsRows,
      `movements-${new Date().toISOString().slice(0, 10)}.pdf`,
      companyName,
      companyPhone,
      companyAddress,
      companyLogo
    );
  };

  const repReturnsRows = filteredRepReturns.map(r => [
    r.date, r.representativeName,
    r.items.map(i => `${i.productName} (${i.quantity})`).join('، '),
    r.totalValue, r.notes || ''
  ]);

  const exportRepReturnsExcel = () => {
    exportExcel(
      [['التاريخ', 'المندوب', 'الأصناف', 'القيمة', 'ملاحظات'], ...repReturnsRows],
      'مرتجعات المندوبين',
      `rep-returns-${new Date().toISOString().slice(0, 10)}.xlsx`
    );
  };

  const exportRepReturnsPdf = () => {
    exportPdf(
      'تقرير مرتجعات المندوبين',
      ['التاريخ', 'المندوب', 'الأصناف', 'القيمة', 'ملاحظات'],
      repReturnsRows,
      `rep-returns-${new Date().toISOString().slice(0, 10)}.pdf`,
      companyName,
      companyPhone,
      companyAddress,
      companyLogo
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold">التقارير</h2>
          <p className="text-sm text-slate-500">ملخصات محاسبية + تصدير PDF / Excel</p>
        </div>
        <button onClick={handleExportJSON} className="flex items-center gap-2 bg-slate-800 text-white px-4 py-2.5 rounded-xl text-sm hover:bg-slate-700">
          <Download className="w-4 h-4" /> نسخ احتياطي JSON
        </button>
      </div>

      {/* فلتر الفترة الزمنية — يؤثر على كل التقارير أسفل هذا الشريط */}
      <div className="bg-surface rounded-2xl p-4 shadow-soft border border-slate-100 dark:border-slate-700 flex items-center gap-3 flex-wrap">
        <span className="flex items-center gap-2 text-sm font-bold text-slate-600 dark:text-slate-300 shrink-0">
          <Calendar className="w-4 h-4 text-secondary" /> الفترة الزمنية
        </span>
        <div className="flex items-center gap-2">
          <label className="text-xs text-slate-400">من</label>
          <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-transparent text-sm outline-none focus:ring-2 focus:ring-secondary" />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs text-slate-400">إلى</label>
          <input type="date" value={toDate} onChange={e => setToDate(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-transparent text-sm outline-none focus:ring-2 focus:ring-secondary" />
        </div>
        {hasDateFilter && (
          <button
            type="button"
            onClick={() => { setFromDate(''); setToDate(''); }}
            className="flex items-center gap-1 text-xs text-red-500 hover:text-red-600 mr-auto"
          >
            <X className="w-3.5 h-3.5" /> إلغاء الفلتر (عرض كل الفترات)
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[
          { label: 'إجمالي المبيعات', value: formatCurrency(totalSales) },
          { label: 'إجمالي التحصيلات (صافي)', value: formatCurrency(totalCollections) },
          { label: 'قيمة مرتجعات العملاء', value: formatCurrency(totalReturns) },
          { label: 'مسترد نقداً للعملاء', value: formatCurrency(totalRefundsToCustomers) },
          { label: 'قيمة مرتجعات المندوبين', value: formatCurrency(totalRepReturns) }
        ].map((c, i) => (
          <div key={i} className="bg-surface rounded-2xl p-5 shadow-soft border border-slate-100 dark:border-slate-700">
            <p className="text-sm text-slate-500">{c.label}</p>
            <p className="text-xl font-bold mt-1">{c.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-surface rounded-2xl p-5 shadow-soft border border-slate-100 dark:border-slate-700 space-y-3">
          <h3 className="font-bold flex items-center gap-2"><FileText className="w-5 h-5 text-secondary" /> تقرير المبيعات</h3>
          <p className="text-xs text-slate-500">{filteredInvoices.length} فاتورة</p>
          <div className="flex gap-2">
            <button onClick={exportSalesExcel} className="flex-1 flex items-center justify-center gap-1 bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 py-2 rounded-xl text-sm">
              <FileSpreadsheet className="w-4 h-4" /> Excel
            </button>
            <button onClick={exportSalesPdf} className="flex-1 flex items-center justify-center gap-1 bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300 py-2 rounded-xl text-sm">
              PDF
            </button>
          </div>
        </div>

        <div className="bg-surface rounded-2xl p-5 shadow-soft border border-slate-100 dark:border-slate-700 space-y-3">
          <h3 className="font-bold flex items-center gap-2"><FileSpreadsheet className="w-5 h-5 text-secondary" /> تقرير المخزون</h3>
          <p className="text-xs text-slate-500">{data.products.length} صنف</p>
          <button onClick={exportStockExcel} className="w-full flex items-center justify-center gap-1 bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 py-2 rounded-xl text-sm">
            <FileSpreadsheet className="w-4 h-4" /> Excel
          </button>
        </div>

        <div className="bg-surface rounded-2xl p-5 shadow-soft border border-slate-100 dark:border-slate-700 space-y-3">
          <h3 className="font-bold flex items-center gap-2"><FileText className="w-5 h-5 text-secondary" /> حركة المخزون</h3>
          <p className="text-xs text-slate-500">{filteredMovements.length} حركة</p>
          <div className="flex gap-2">
            <button onClick={exportMovementsExcel} className="flex-1 flex items-center justify-center gap-1 bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 py-2 rounded-xl text-sm">
              Excel
            </button>
            <button onClick={exportMovementsPdf} className="flex-1 flex items-center justify-center gap-1 bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300 py-2 rounded-xl text-sm">
              PDF
            </button>
          </div>
        </div>

        <div className="bg-surface rounded-2xl p-5 shadow-soft border border-slate-100 dark:border-slate-700 space-y-3">
          <h3 className="font-bold flex items-center gap-2"><FileText className="w-5 h-5 text-orange-500" /> مرتجعات المندوبين</h3>
          <p className="text-xs text-slate-500">{filteredRepReturns.length} مرتجع</p>
          <div className="flex gap-2">
            <button onClick={exportRepReturnsExcel} className="flex-1 flex items-center justify-center gap-1 bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 py-2 rounded-xl text-sm">
              Excel
            </button>
            <button onClick={exportRepReturnsPdf} className="flex-1 flex items-center justify-center gap-1 bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300 py-2 rounded-xl text-sm">
              PDF
            </button>
          </div>
        </div>
      </div>

      <div className="bg-surface rounded-2xl p-6 shadow-soft border border-slate-100 dark:border-slate-700">
        <h3 className="font-bold mb-4">{hasDateFilter ? 'الفواتير ضمن الفترة المحددة' : 'آخر الفواتير'}</h3>
        <table className="w-full text-sm">
          <thead className="bg-slate-50 dark:bg-slate-800">
            <tr>
              <th className="text-right p-3">الرقم</th>
              <th className="text-right p-3">العميل</th>
              <th className="text-right p-3">التاريخ</th>
              <th className="text-right p-3">المبلغ</th>
            </tr>
          </thead>
          <tbody>
            {(hasDateFilter ? filteredInvoices.slice().reverse() : filteredInvoices.slice(-10).reverse()).map(inv => (
              <tr key={inv.id} className="border-t border-slate-100 dark:border-slate-700">
                <td className="p-3">{inv.number}</td>
                <td className="p-3">{inv.customerName}</td>
                <td className="p-3">{formatDate(inv.date)}</td>
                <td className="p-3 font-medium">{formatCurrency(inv.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {filteredInvoices.length === 0 && <p className="text-center text-slate-400 py-6">لا توجد بيانات ضمن الفترة المحددة</p>}
      </div>
    </div>
  );
}
