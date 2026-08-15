import { useState } from 'react';
import { Plus, Search, Trash2, RotateCcw } from 'lucide-react';
import { useApp } from '../store/AppContext';
import { formatCurrency, formatDate } from '../lib/utils';
import { appAlert } from '../lib/dialogs';
import SearchSelect from '../components/SearchSelect';
import NumberInput from '../components/NumberInput';

/**
 * مرتجعات المندوبين:
 * عند إرجاع جزء من البضاعة المستلمة من مندوب الشركة،
 * يتم خصم الكمية من المخزون وخصم القيمة من رصيد المندوب.
 */
export default function RepresentativeReturns() {
  const { data, addRepresentativeReturn, deleteRepresentativeReturn } = useApp();
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);

  // Form state
  const [repId, setRepId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<{ productId: string; productName: string; quantity: number; unitPrice: number }[]>([]);
  const [productSearch, setProductSearch] = useState('');
  const [selectedProductId, setSelectedProductId] = useState('');
  const [qty, setQty] = useState(1);
  const [unitPrice, setUnitPrice] = useState(0);

  const returnsList = (data.representativeReturns || []).filter(r =>
    r.representativeName.includes(search) || r.notes.includes(search)
  ).sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  const handlePickProduct = (id: string, label: string) => {
    setSelectedProductId(id);
    setProductSearch(label);
    const product = data.products.find(p => p.id === id);
    setUnitPrice(product?.purchasePrice || 0); // يُقترَح تلقائياً سعر الشراء، وقابل للتعديل
  };

  const addItem = () => {
    const product = data.products.find(p => p.id === selectedProductId);
    if (!product || qty <= 0) return;
    const existing = items.find(i => i.productId === product.id);
    if (existing) {
      setItems(items.map(i => i.productId === product.id
        ? { ...i, quantity: i.quantity + qty }
        : i));
    } else {
      setItems([...items, {
        productId: product.id,
        productName: product.name,
        quantity: qty,
        unitPrice
      }]);
    }
    setSelectedProductId('');
    setProductSearch('');
    setQty(1);
    setUnitPrice(0);
  };

  const totalValue = items.reduce((s, i) => s + i.quantity * i.unitPrice, 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const rep = data.representatives.find(r => r.id === repId);
    if (!rep || items.length === 0) {
      appAlert('اختر المندوب وأضف أصنافاً');
      return;
    }
    addRepresentativeReturn({
      representativeId: repId,
      representativeName: rep.name,
      items: items.map(i => ({ productId: i.productId, productName: i.productName, quantity: i.quantity, unitPrice: i.unitPrice })),
      totalValue,
      date,
      notes
    });
    setShowForm(false);
    setRepId('');
    setItems([]);
    setNotes('');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">مرتجعات المندوبين</h2>
          <p className="text-sm text-slate-500">إرجاع بضاعة إلى مندوب الشركة — يخصم من رصيده ومن المخزون</p>
        </div>
        <button onClick={() => setShowForm(true)} className="flex items-center gap-2 bg-secondary text-white px-4 py-2.5 rounded-xl font-medium hover:bg-emerald-600">
          <Plus className="w-4 h-4" /> تسجيل مرتجع مندوب
        </button>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="بحث باسم المندوب..."
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
            {returnsList.length === 0 ? (
              <tr><td colSpan={6} className="p-8 text-center text-slate-400">لا توجد مرتجعات مندوبين بعد</td></tr>
            ) : returnsList.map(r => (
              <tr key={r.id} className="border-t border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                <td className="p-4 font-medium flex items-center gap-2">
                  <RotateCcw className="w-4 h-4 text-orange-500" />
                  {r.representativeName}
                </td>
                <td className="p-4">{formatDate(r.date)}</td>
                <td className="p-4 text-xs">
                  {r.items.map(i => `${i.productName} (${i.quantity})`).join('، ')}
                </td>
                <td className="p-4 font-bold text-orange-600">{formatCurrency(r.totalValue)}</td>
                <td className="p-4 text-slate-500">{r.notes || '—'}</td>
                <td className="p-4">
                  <button onClick={() => deleteRepresentativeReturn(r.id)}
                    className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/30">
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
            <h3 className="text-lg font-bold">تسجيل مرتجع إلى مندوب</h3>
            <p className="text-xs text-slate-500">سيتم خصم الكمية من المخزون وخصم القيمة من رصيد المندوب</p>

            <div>
              <label className="text-sm font-medium mb-1 block">المندوب *</label>
              <SearchSelect
                value={repId}
                display={data.representatives.find(r => r.id === repId)?.name || ''}
                placeholder="ابحث عن مندوب أو اختر من القائمة..."
                options={data.representatives.map(r => ({ id: r.id, label: r.name, sub: r.phone }))}
                onQueryChange={() => setRepId('')}
                onPick={(id) => setRepId(id)}
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">التاريخ</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-transparent outline-none" />
            </div>

            {/* Add items */}
            <div className="border-t border-slate-100 dark:border-slate-700 pt-3">
              <label className="text-sm font-medium mb-2 block">الأصناف المرجعة</label>
              <div className="flex flex-wrap gap-2 items-end">
                <div className="flex-1 min-w-[180px]">
                  <SearchSelect
                    value={selectedProductId}
                    display={productSearch}
                    placeholder="ابحث عن صنف..."
                    options={data.products.map(p => ({ id: p.id, label: p.name, sub: `مخزون: ${p.currentStock}` }))}
                    onQueryChange={q => { setProductSearch(q); setSelectedProductId(''); }}
                    onPick={(id, label) => handlePickProduct(id, label)}
                  />
                </div>
                <input type="number" min={1} value={qty} onChange={e => setQty(+e.target.value)}
                  className="w-20 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-transparent text-center" />
                <div>
                  <label className="text-[11px] text-slate-400 block mb-0.5">سعر الوحدة</label>
                  <input type="number" min={0} value={unitPrice} onChange={e => setUnitPrice(+e.target.value)}
                    className="w-28 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-transparent text-center" />
                </div>
                <button type="button" onClick={addItem} className="bg-secondary text-white px-3 py-2 rounded-xl text-sm">
                  إضافة
                </button>
              </div>

              {items.length > 0 && (
                <ul className="mt-3 space-y-1 text-sm">
                  {items.map(i => (
                    <li key={i.productId} className="flex justify-between items-center bg-slate-50 dark:bg-slate-800 rounded-lg px-3 py-2">
                      <span>{i.productName} × {i.quantity}</span>
                      <span className="font-medium">{formatCurrency(i.quantity * i.unitPrice)}</span>
                    </li>
                  ))}
                  <li className="flex justify-between font-bold pt-2 border-t border-slate-200 dark:border-slate-600">
                    <span>إجمالي القيمة</span>
                    <span className="text-orange-600">{formatCurrency(totalValue)}</span>
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
