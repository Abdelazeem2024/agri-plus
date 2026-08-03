import { useState } from 'react';
import { Plus, Search, Trash2, RotateCcw } from 'lucide-react';
import { useApp } from '../store/AppContext';
import { formatCurrency, formatDate } from '../lib/utils';
import type { InvoiceItem } from '../types';
import { appAlert, appConfirm } from '../lib/dialogs';
import SearchSelect from '../components/SearchSelect';
import NumberInput from '../components/NumberInput';

/**
 * مرتجعات العملاء:
 * عند إرجاع جزء من فاتورة بيع، يتم:
 * - إعادة الكمية إلى المخزون
 * - خصم قيمة المرتجع من رصيد العميل (المبيعات - التحصيلات - المرتجعات)
 */
export default function CustomerReturns() {
  const { data, addReturn, deleteReturn } = useApp();
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);

  const [customerId, setCustomerId] = useState('');
  const [invoiceId, setInvoiceId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<InvoiceItem[]>([]);
  const [productSearch, setProductSearch] = useState('');
  const [selectedProductId, setSelectedProductId] = useState('');
  const [showProductList, setShowProductList] = useState(false);
  const [qty, setQty] = useState(1);

  const returnsList = data.returns.filter(r =>
    r.customerName.includes(search) || r.notes.includes(search)
  ).sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  const customerInvoices = data.invoices.filter(i => i.customerId === customerId);
  const selectedInvoice = data.invoices.find(i => i.id === invoiceId);

  const filteredProducts = data.products.filter(p =>
    p.name.includes(productSearch) || p.tradeName.includes(productSearch)
  ).slice(0, 8);

  const addItem = () => {
    const product = data.products.find(p => p.id === selectedProductId);
    if (!product || qty <= 0) return;
    const existing = items.find(i => i.productId === product.id);
    if (existing) {
      setItems(items.map(i => i.productId === product.id
        ? { ...i, quantity: i.quantity + qty, total: (i.quantity + qty) * i.unitPrice }
        : i));
    } else {
      setItems([...items, {
        productId: product.id,
        productName: product.name,
        quantity: qty,
        unitPrice: product.salePrice,
        total: qty * product.salePrice
      }]);
    }
    setSelectedProductId('');
    setProductSearch('');
    setShowProductList(false);
    setQty(1);
  };

  const total = items.reduce((s, i) => s + i.total, 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const customer = data.customers.find(c => c.id === customerId);
    if (!customer || items.length === 0) {
      appAlert('اختر العميل وأضف أصنافاً');
      return;
    }

    // إذا رُبطت بفاتورة: التحقق أن الكمية المرجعة لا تتجاوز المباعة (ناقص المرتجعات السابقة)
    if (invoiceId) {
      const invoice = data.invoices.find(i => i.id === invoiceId);
      if (invoice) {
        const previousReturns = data.returns.filter(r => r.invoiceId === invoiceId);
        for (const item of items) {
          const sold = invoice.items.find(ii => ii.productId === item.productId)?.quantity || 0;
          const alreadyReturned = previousReturns.reduce((s, r) => {
            const ri = r.items.find(ii => ii.productId === item.productId);
            return s + (ri?.quantity || 0);
          }, 0);
          const available = sold - alreadyReturned;
          if (item.quantity > available) {
            appAlert(`لا يمكن إرجاع ${item.quantity} من "${item.productName}". المتاح للإرجاع من هذه الفاتورة: ${available}`);
            return;
          }
        }
      }
    }

    addReturn({
      invoiceId: invoiceId || '',
      customerId,
      customerName: customer.name,
      items,
      total,
      date,
      notes
    });
    setShowForm(false);
    setCustomerId('');
    setInvoiceId('');
    setItems([]);
    setNotes('');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">مرتجعات العملاء</h2>
          <p className="text-sm text-slate-500">إرجاع بضاعة من العميل — يعيد الكمية للمخزون ويخصم من رصيد العميل</p>
        </div>
        <button onClick={() => setShowForm(true)} className="flex items-center gap-2 bg-secondary text-white px-4 py-2.5 rounded-xl font-medium hover:bg-emerald-600">
          <Plus className="w-4 h-4" /> تسجيل مرتجع عميل
        </button>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="بحث باسم العميل..."
          className="w-full pr-10 pl-4 py-2.5 rounded-xl bg-surface border border-slate-200 dark:border-slate-700 outline-none focus:ring-2 focus:ring-secondary text-sm" />
      </div>

      <div className="bg-surface rounded-2xl shadow-soft border border-slate-100 dark:border-slate-700 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 dark:bg-slate-800">
            <tr>
              <th className="text-right p-4 font-medium">العميل</th>
              <th className="text-right p-4 font-medium">التاريخ</th>
              <th className="text-right p-4 font-medium">الأصناف</th>
              <th className="text-right p-4 font-medium">القيمة</th>
              <th className="text-right p-4 font-medium">ملاحظات</th>
              <th className="text-right p-4 font-medium">إجراءات</th>
            </tr>
          </thead>
          <tbody>
            {returnsList.length === 0 ? (
              <tr><td colSpan={6} className="p-8 text-center text-slate-400">لا توجد مرتجعات عملاء بعد</td></tr>
            ) : returnsList.map(r => (
              <tr key={r.id} className="border-t border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                <td className="p-4 font-medium flex items-center gap-2">
                  <RotateCcw className="w-4 h-4 text-blue-500" />
                  {r.customerName}
                </td>
                <td className="p-4">{formatDate(r.date)}</td>
                <td className="p-4 text-xs">
                  {r.items.map(i => `${i.productName} (${i.quantity})`).join('، ')}
                </td>
                <td className="p-4 font-bold text-blue-600">{formatCurrency(r.total)}</td>
                <td className="p-4 text-slate-500">{r.notes || '—'}</td>
                <td className="p-4">
                  <button onClick={() => appConfirm('حذف هذا المرتجع؟') && deleteReturn(r.id)}
                    className="p-1.5 rounded-lg hover:bg-red-50">
                    <Trash2 className="w-4 h-4 text-danger" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/40 z-40 flex items-center justify-center p-4 overflow-y-auto" onClick={() => setShowForm(false)}>
          <form onClick={e => e.stopPropagation()} onSubmit={handleSubmit}
            className="bg-surface rounded-2xl p-6 w-full max-w-lg shadow-xl space-y-4 my-8">
            <h3 className="text-lg font-bold">تسجيل مرتجع من عميل</h3>
            <p className="text-xs text-slate-500">سيتم إعادة الكمية إلى المخزون وخصم القيمة من رصيد العميل</p>

            <div>
              <label className="text-sm font-medium mb-1 block">العميل *</label>
              <select required value={customerId} onChange={e => { setCustomerId(e.target.value); setInvoiceId(''); }}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-transparent outline-none focus:ring-2 focus:ring-secondary">
                <option value="">اختر العميل</option>
                {data.customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>

            {customerId && (
              <div>
                <label className="text-sm font-medium mb-1 block">ربط بفاتورة (اختياري)</label>
                <select value={invoiceId} onChange={e => setInvoiceId(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-transparent outline-none focus:ring-2 focus:ring-secondary">
                  <option value="">بدون ربط</option>
                  {customerInvoices.map(inv => (
                    <option key={inv.id} value={inv.id}>{inv.number} — {formatCurrency(inv.total)}</option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="text-sm font-medium mb-1 block">التاريخ</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-transparent outline-none" />
            </div>

            <div className="border-t border-slate-100 dark:border-slate-700 pt-3">
              <label className="text-sm font-medium mb-2 block">الأصناف المرجعة</label>
              <div className="flex flex-wrap gap-2 items-end">
                <SearchSelect
                  value={selectedProductId}
                  display={productSearch}
                  placeholder="ابحث عن صنف..."
                  options={data.products.map(p => ({ id: p.id, label: p.name, sub: formatCurrency(p.salePrice) }))}
                  onQueryChange={q => { setProductSearch(q); setSelectedProductId(''); }}
                  onPick={(id, label) => { setSelectedProductId(id); setProductSearch(label); }}
                />
                <NumberInput value={qty} onChange={setQty} min={1} placeholder="الكمية" className="w-24 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-transparent text-center text-sm outline-none" />
                <button type="button" onClick={addItem} className="bg-secondary text-white px-3 py-2 rounded-xl text-sm">إضافة</button>
              </div>

              {items.length > 0 && (
                <ul className="mt-3 space-y-1 text-sm">
                  {items.map(i => (
                    <li key={i.productId} className="flex justify-between items-center bg-slate-50 dark:bg-slate-800 rounded-lg px-3 py-2">
                      <span>{i.productName} × {i.quantity}</span>
                      <span className="font-medium">{formatCurrency(i.total)}</span>
                    </li>
                  ))}
                  <li className="flex justify-between font-bold pt-2 border-t border-slate-200 dark:border-slate-600">
                    <span>إجمالي المرتجع</span>
                    <span className="text-blue-600">{formatCurrency(total)}</span>
                  </li>
                </ul>
              )}
            </div>

            <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="ملاحظات"
              rows={2} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-transparent outline-none" />

            <div className="flex gap-3">
              <button type="submit" className="flex-1 bg-secondary text-white py-2.5 rounded-xl font-medium">حفظ المرتجع</button>
              <button type="button" onClick={() => setShowForm(false)} className="flex-1 bg-slate-100 dark:bg-slate-700 py-2.5 rounded-xl font-medium">إلغاء</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
