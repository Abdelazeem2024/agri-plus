import { useState } from 'react';
import { Plus, Search, Trash2, RotateCcw } from 'lucide-react';
import { useApp } from '../store/AppContext';
import { formatCurrency, formatDate } from '../lib/utils';
import type { InvoiceItem } from '../types';
import { appAlert } from '../lib/dialogs';
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
  const [unitPrice, setUnitPrice] = useState(0);
  const [refundAmount, setRefundAmount] = useState<number | ''>('');

  const returnsList = data.returns.filter(r =>
    r.customerName.includes(search) || r.notes.includes(search)
  ).sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  const customerInvoices = data.invoices.filter(i => i.customerId === customerId);
  const selectedInvoice = data.invoices.find(i => i.id === invoiceId);

  const filteredProducts = data.products.filter(p =>
    p.name.includes(productSearch) || p.tradeName.includes(productSearch)
  ).slice(0, 8);

  // عند اختيار صنف: نقترح سعره تلقائياً (من الفاتورة المرتبطة إن وُجدت، وإلا سعر البيع
  // الحالي)، لكن يبقى قابلاً للتعديل يدوياً قبل الإضافة — هذا هو الحقل الذي كان ناقصاً
  const handlePickProduct = (id: string, label: string) => {
    setSelectedProductId(id);
    setProductSearch(label);
    const invItem = selectedInvoice?.items.find(ii => ii.productId === id);
    const product = data.products.find(p => p.id === id);
    setUnitPrice(invItem ? invItem.unitPrice : (product?.salePrice || 0));
  };

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
        unitPrice,
        total: qty * unitPrice
      }]);
    }
    setSelectedProductId('');
    setProductSearch('');
    setShowProductList(false);
    setQty(1);
    setUnitPrice(0);
  };

  const total = items.reduce((s, i) => s + i.total, 0);

  // الرصيد الحالي المستحق على العميل قبل تسجيل هذا المرتجع — لمساعدة البائع على
  // تقدير المبلغ الصحيح الذي يجب استرداده نقداً (إن كان العميل دفع أكثر مما تبقى عليه)
  const customerCurrentBalance = (() => {
    if (!customerId) return null;
    const customer = data.customers.find(c => c.id === customerId);
    if (!customer) return null;
    const opening = customer.openingBalance || 0;
    const invoicesTotal = data.invoices.filter(i => i.customerId === customerId).reduce((s, i) => s + i.total, 0);
    const collectionsTotal = data.collections.filter(c => c.customerId === customerId).reduce((s, c) => s + c.amount, 0);
    const returnsTotal = data.returns.filter(r => r.customerId === customerId).reduce((s, r) => s + r.total, 0);
    const refundsTotal = data.returns.filter(r => r.customerId === customerId).reduce((s, r) => s + (r.refundAmount || 0), 0);
    return opening + invoicesTotal - collectionsTotal - returnsTotal + refundsTotal;
  })();

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
      notes,
      refundAmount: refundAmount === '' ? 0 : refundAmount
    });
    setShowForm(false);
    setCustomerId('');
    setInvoiceId('');
    setItems([]);
    setNotes('');
    setRefundAmount('');
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
                  <button onClick={() => deleteReturn(r.id)}
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
                  onPick={handlePickProduct}
                />
                <NumberInput value={qty} onChange={setQty} min={1} placeholder="الكمية" className="w-24 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-transparent text-center text-sm outline-none" />
                <div>
                  <label className="text-[11px] text-slate-400 block mb-0.5">سعر الوحدة</label>
                  <NumberInput value={unitPrice} onChange={setUnitPrice} min={0} placeholder="السعر" className="w-28 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-transparent text-center text-sm outline-none" />
                </div>
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

            {customerCurrentBalance != null && (
              <div className="text-xs bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-xl px-3 py-2">
                الرصيد الحالي المستحق على العميل (قبل هذا المرتجع): <strong>{formatCurrency(customerCurrentBalance)}</strong>
              </div>
            )}

            <div>
              <label className="text-xs text-slate-500 block mb-1">المبلغ المسترد نقداً للعميل (اختياري)</label>
              <NumberInput
                value={refundAmount === '' ? 0 : refundAmount}
                onChange={v => setRefundAmount(v)}
                min={0}
                placeholder="اتركه فارغاً إن لم تُعِد أي نقود للعميل"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-transparent outline-none"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                أدخل هذا المبلغ فقط إذا أعطيت العميل نقوداً فعلياً عند استلام المرتجع (مثلاً كان قد دفع جزءاً من ثمن البضاعة المرتجعة). سيُخصَم تلقائياً من إجمالي التحصيلات في كل التقارير ويظهر في كشف حسابه كمبلغ مسترد.
              </p>
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
