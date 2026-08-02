import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../store/AppContext';
import { formatCurrency } from '../lib/utils';
import type { InvoiceItem } from '../types';
import { Plus, Trash2, ArrowRight } from 'lucide-react';

export default function NewInvoice() {
  const { data, addInvoice } = useApp();
  const navigate = useNavigate();
  const [customerId, setCustomerId] = useState('');
  const [discount, setDiscount] = useState(0);
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<InvoiceItem[]>([]);
  const [productSearch, setProductSearch] = useState('');
  const [selectedProductId, setSelectedProductId] = useState('');
  const [qty, setQty] = useState(1);

  const customer = data.customers.find(c => c.id === customerId);
  const subtotal = items.reduce((s, i) => s + i.total, 0);
  const total = Math.max(0, subtotal - discount);

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
    setQty(1);
  };

  const removeItem = (productId: string) => {
    setItems(items.filter(i => i.productId !== productId));
  };

  const handleSave = () => {
    if (!customerId || items.length === 0) {
      alert('اختر عميلاً وأضف أصنافاً');
      return;
    }
    addInvoice({
      customerId,
      customerName: customer?.name || '',
      items,
      subtotal,
      discount,
      total,
      notes,
      date: new Date().toISOString().split('T')[0]
    });
    navigate('/invoices');
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/invoices')} className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800">
          <ArrowRight className="w-5 h-5" />
        </button>
        <h2 className="text-2xl font-bold">فاتورة بيع جديدة</h2>
      </div>

      <div className="bg-surface rounded-2xl p-6 shadow-soft border border-slate-100 dark:border-slate-700 space-y-4">
        <div>
          <label className="text-sm font-medium mb-1 block">العميل *</label>
          <select value={customerId} onChange={e => setCustomerId(e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-transparent outline-none focus:ring-2 focus:ring-secondary">
            <option value="">اختر العميل</option>
            {data.customers.map(c => <option key={c.id} value={c.id}>{c.name} - {c.phone}</option>)}
          </select>
        </div>

        <div className="border-t border-slate-100 dark:border-slate-700 pt-4">
          <label className="text-sm font-medium mb-2 block">إضافة أصناف</label>
          <div className="flex flex-wrap gap-2 items-end">
            <div className="flex-1 min-w-[200px]">
              <input value={productSearch} onChange={e => setProductSearch(e.target.value)}
                placeholder="ابحث عن صنف..."
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-transparent outline-none focus:ring-2 focus:ring-secondary text-sm" />
              {productSearch && filteredProducts.length > 0 && (
                <div className="mt-1 bg-surface border border-slate-200 dark:border-slate-600 rounded-xl shadow-lg max-h-40 overflow-y-auto">
                  {filteredProducts.map(p => (
                    <button key={p.id} type="button" onClick={() => { setSelectedProductId(p.id); setProductSearch(p.name); }}
                      className="w-full text-right px-4 py-2 hover:bg-slate-50 dark:hover:bg-slate-800 text-sm">
                      {p.name} — {formatCurrency(p.salePrice)} (مخزون: {p.currentStock})
                    </button>
                  ))}
                </div>
              )}
            </div>
            <input type="number" min={1} value={qty} onChange={e => setQty(+e.target.value)}
              className="w-20 px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-transparent outline-none text-center" />
            <button type="button" onClick={addItem} className="bg-secondary text-white px-4 py-2.5 rounded-xl flex items-center gap-1">
              <Plus className="w-4 h-4" /> إضافة
            </button>
          </div>
        </div>

        {items.length > 0 && (
          <table className="w-full text-sm mt-4">
            <thead className="bg-slate-50 dark:bg-slate-800">
              <tr>
                <th className="text-right p-3">الصنف</th>
                <th className="text-right p-3">الكمية</th>
                <th className="text-right p-3">السعر</th>
                <th className="text-right p-3">الإجمالي</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {items.map(item => (
                <tr key={item.productId} className="border-t border-slate-100 dark:border-slate-700">
                  <td className="p-3">{item.productName}</td>
                  <td className="p-3">{item.quantity}</td>
                  <td className="p-3">{formatCurrency(item.unitPrice)}</td>
                  <td className="p-3 font-medium">{formatCurrency(item.total)}</td>
                  <td className="p-3">
                    <button onClick={() => removeItem(item.productId)} className="p-1 hover:bg-red-50 rounded">
                      <Trash2 className="w-4 h-4 text-danger" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <div className="flex flex-wrap gap-4 items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-700">
          <div className="flex items-center gap-2">
            <label className="text-sm">الخصم:</label>
            <input type="number" min={0} value={discount} onChange={e => setDiscount(+e.target.value)}
              className="w-28 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-transparent outline-none" />
          </div>
          <div className="text-left space-y-1">
            <div className="text-sm text-slate-500">المجموع: {formatCurrency(subtotal)}</div>
            <div className="text-xl font-bold text-secondary">الصافي: {formatCurrency(total)}</div>
          </div>
        </div>

        <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="ملاحظات الفاتورة"
          rows={2} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-transparent outline-none" />

        <div className="flex gap-3">
          <button onClick={handleSave} className="flex-1 bg-secondary text-white py-3 rounded-xl font-medium hover:bg-emerald-600">
            حفظ الفاتورة
          </button>
          <button onClick={() => navigate('/invoices')} className="px-6 bg-slate-100 dark:bg-slate-700 py-3 rounded-xl font-medium">
            إلغاء
          </button>
        </div>
      </div>
    </div>
  );
}
