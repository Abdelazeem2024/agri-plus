import { useState } from 'react';
import { Plus, Search, PackagePlus, Trash2, Pencil } from 'lucide-react';
import { useApp } from '../store/AppContext';
import { formatCurrency, formatDate } from '../lib/utils';
import type { StockReceipt } from '../types';

export default function StockReceipts() {
  const { data, addStockReceipt, deleteStockReceipt, updateStockReceipt } = useApp();
  const [search, setSearch] = useState('');
  const [show, setShow] = useState(false);
  const [editing, setEditing] = useState<StockReceipt | null>(null);
  const [repId, setRepId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<{ productId: string; productName: string; quantity: number }[]>([]);
  const [productSearch, setProductSearch] = useState('');
  const [selectedProductId, setSelectedProductId] = useState('');
  const [qty, setQty] = useState(1);

  const list = (data.stockReceipts || [])
    .filter(r => r.representativeName.includes(search) || (r.notes || '').includes(search))
    .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));

  const filteredProducts = data.products.filter(p =>
    p.name.includes(productSearch) || p.tradeName.includes(productSearch)
  ).slice(0, 8);

  const resetForm = () => {
    setEditing(null);
    setRepId('');
    setDate(new Date().toISOString().split('T')[0]);
    setNotes('');
    setItems([]);
    setProductSearch('');
    setSelectedProductId('');
    setQty(1);
  };

  const openAdd = () => {
    resetForm();
    setShow(true);
  };

  const openEdit = (r: StockReceipt) => {
    // التعديل = حذف القديم + إنشاء جديد (لتسوية المخزون بشكل صحيح)
    setEditing(r);
    setRepId(r.representativeId);
    setDate(r.date);
    setNotes(r.notes || '');
    setItems(r.items.map(i => ({ productId: i.productId, productName: i.productName, quantity: i.quantity })));
    setShow(true);
  };

  const addItem = () => {
    const product = data.products.find(p => p.id === selectedProductId);
    if (!product || qty <= 0) return;
    const existing = items.find(i => i.productId === product.id);
    if (existing) {
      setItems(items.map(i => i.productId === product.id ? { ...i, quantity: i.quantity + qty } : i));
    } else {
      setItems([...items, { productId: product.id, productName: product.name, quantity: qty }]);
    }
    setSelectedProductId('');
    setProductSearch('');
    setQty(1);
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const rep = data.representatives.find(r => r.id === repId);
    if (!rep || items.length === 0) {
      alert('اختر المندوب وأضف أصنافاً');
      return;
    }

    if (editing) {
      const ok = updateStockReceipt(editing.id, {
        representativeId: repId,
        representativeName: rep.name,
        items,
        date,
        notes
      });
      if (!ok) return;
    } else {
      addStockReceipt({
        representativeId: repId,
        representativeName: rep.name,
        items,
        date,
        notes
      });
    }

    setShow(false);
    resetForm();
  };

  const handleDelete = (id: string) => {
    deleteStockReceipt(id);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">استلام بضاعة من المندوب</h2>
          <p className="text-sm text-slate-500">
            {list.length} استلام — يزيد المخزون ويُسجَّل على رصيد المندوب بسعر الشراء وقت الاستلام
          </p>
        </div>
        <button onClick={openAdd} className="flex items-center gap-2 bg-secondary text-white px-4 py-2.5 rounded-xl font-medium hover:bg-emerald-600">
          <Plus className="w-4 h-4" /> استلام جديد
        </button>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="بحث بالمندوب أو الملاحظات..."
          className="w-full pr-10 pl-4 py-2.5 rounded-xl bg-surface border border-slate-200 dark:border-slate-700 outline-none focus:ring-2 focus:ring-secondary text-sm" />
      </div>

      <div className="bg-surface rounded-2xl shadow-soft border border-slate-100 dark:border-slate-700 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 dark:bg-slate-800">
            <tr>
              <th className="text-right p-4 font-medium">المندوب</th>
              <th className="text-right p-4 font-medium">التاريخ</th>
              <th className="text-right p-4 font-medium">الأصناف</th>
              <th className="text-right p-4 font-medium">القيمة</th>
              <th className="text-right p-4 font-medium">ملاحظات</th>
              <th className="text-right p-4 font-medium">إجراءات</th>
            </tr>
          </thead>
          <tbody>
            {list.length === 0 ? (
              <tr><td colSpan={6} className="p-8 text-center text-slate-400">لا توجد استلامات</td></tr>
            ) : list.map(r => (
              <tr key={r.id} className="border-t border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                <td className="p-4 font-medium">
                  <div className="flex items-center gap-2">
                    <PackagePlus className="w-4 h-4 text-secondary" />
                    {r.representativeName}
                  </div>
                </td>
                <td className="p-4">{formatDate(r.date)}</td>
                <td className="p-4 text-xs max-w-[220px]">{r.items.map(i => `${i.productName} (${i.quantity})`).join('، ')}</td>
                <td className="p-4 font-bold">{formatCurrency(r.totalValue || 0)}</td>
                <td className="p-4 text-slate-500">{r.notes || '—'}</td>
                <td className="p-4">
                  <div className="flex gap-2">
                    <button onClick={() => openEdit(r)} title="تعديل" className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700">
                      <Pencil className="w-4 h-4 text-slate-500" />
                    </button>
                    <button onClick={() => handleDelete(r.id)} title="حذف" className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/30">
                      <Trash2 className="w-4 h-4 text-danger" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {show && (
        <div className="fixed inset-0 bg-black/40 z-40 flex items-center justify-center p-4 overflow-y-auto" onClick={() => { setShow(false); resetForm(); }}>
          <form onClick={e => e.stopPropagation()} onSubmit={submit} className="bg-surface rounded-2xl p-6 w-full max-w-lg shadow-xl space-y-4 my-8">
            <h3 className="text-lg font-bold">{editing ? 'تعديل استلام بضاعة' : 'استلام بضاعة من مندوب'}</h3>
            {editing && (
              <p className="text-xs text-amber-600 bg-amber-50 dark:bg-amber-900/20 rounded-lg px-3 py-2">
                التعديل يستبدل الاستلام السابق ويسوّي المخزون تلقائياً
              </p>
            )}
            <select required value={repId} onChange={e => setRepId(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-transparent outline-none focus:ring-2 focus:ring-secondary">
              <option value="">اختر المندوب</option>
              {data.representatives.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
            <input type="date" value={date} onChange={e => setDate(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-transparent outline-none" />
            <div>
              <label className="text-sm font-medium mb-2 block">الأصناف</label>
              <div className="flex flex-wrap gap-2 items-end">
                <div className="flex-1 min-w-[160px]">
                  <input value={productSearch} onChange={e => setProductSearch(e.target.value)} placeholder="بحث صنف..."
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-transparent text-sm outline-none" />
                  {productSearch && filteredProducts.length > 0 && (
                    <div className="mt-1 bg-surface border border-slate-200 dark:border-slate-600 rounded-xl shadow-lg max-h-36 overflow-y-auto">
                      {filteredProducts.map(p => (
                        <button key={p.id} type="button" onClick={() => { setSelectedProductId(p.id); setProductSearch(p.name); }}
                          className="w-full text-right px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-800 text-sm">
                          {p.name} — شراء: {formatCurrency(p.purchasePrice)}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <input type="number" min={1} value={qty} onChange={e => setQty(+e.target.value)} className="w-20 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-transparent text-center" />
                <button type="button" onClick={addItem} className="bg-secondary text-white px-3 py-2 rounded-xl text-sm">إضافة</button>
              </div>
              {items.length > 0 && (
                <ul className="mt-2 space-y-1 text-sm">
                  {items.map(i => (
                    <li key={i.productId} className="flex justify-between items-center bg-slate-50 dark:bg-slate-800 rounded-lg px-3 py-2">
                      <span>{i.productName} × {i.quantity}</span>
                      <button type="button" onClick={() => setItems(items.filter(x => x.productId !== i.productId))} className="text-danger text-xs">حذف</button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="ملاحظات" rows={2}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-transparent outline-none" />
            <div className="flex gap-3">
              <button type="submit" className="flex-1 bg-secondary text-white py-2.5 rounded-xl font-medium">
                {editing ? 'حفظ التعديل' : 'حفظ الاستلام'}
              </button>
              <button type="button" onClick={() => { setShow(false); resetForm(); }} className="flex-1 bg-slate-100 dark:bg-slate-700 py-2.5 rounded-xl">إلغاء</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
