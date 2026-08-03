import { useState } from 'react';
import { Plus, Search, Trash2, PackagePlus } from 'lucide-react';
import { useApp } from '../store/AppContext';
import { formatCurrency, formatDate } from '../lib/utils';

type Line = { productId: string; productName: string; quantity: number; unitCost: number };

export default function StockReceipts() {
  const { data, addStockReceipt, deleteStockReceipt } = useApp();
  const [search, setSearch] = useState('');
  const [show, setShow] = useState(false);
  const [repId, setRepId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [paidAmount, setPaidAmount] = useState(0);
  const [items, setItems] = useState<Line[]>([]);
  const [productSearch, setProductSearch] = useState('');
  const [selectedProductId, setSelectedProductId] = useState('');
  const [qty, setQty] = useState(1);
  const [unitCost, setUnitCost] = useState(0);

  const list = (data.stockReceipts || [])
    .filter(r => r.representativeName.includes(search) || (r.notes || '').includes(search))
    .sort((a, b) => b.date.localeCompare(a.date));

  const filteredProducts = data.products.filter(p =>
    p.name.includes(productSearch) || p.company.includes(productSearch)
  ).slice(0, 8);

  const linesTotal = items.reduce((s, i) => s + i.quantity * i.unitCost, 0);

  const addLine = () => {
    const product = data.products.find(p => p.id === selectedProductId);
    if (!product) {
      alert('اختر صنفاً من نتائج البحث');
      return;
    }
    if (qty <= 0) {
      alert('أدخل عدد العبوات');
      return;
    }
    if (unitCost < 0) {
      alert('أدخل سعر الشراء');
      return;
    }
    const existing = items.find(i => i.productId === product.id && i.unitCost === unitCost);
    if (existing) {
      setItems(items.map(i =>
        i.productId === product.id && i.unitCost === unitCost
          ? { ...i, quantity: i.quantity + qty }
          : i
      ));
    } else {
      setItems([...items, { productId: product.id, productName: product.name, quantity: qty, unitCost }]);
    }
    setSelectedProductId('');
    setProductSearch('');
    setQty(1);
    setUnitCost(0);
  };

  const reset = () => {
    setRepId('');
    setDate(new Date().toISOString().split('T')[0]);
    setNotes('');
    setPaidAmount(0);
    setItems([]);
    setProductSearch('');
    setSelectedProductId('');
    setQty(1);
    setUnitCost(0);
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const rep = data.representatives.find(r => r.id === repId);
    if (!rep) {
      alert('اختر المندوب');
      return;
    }
    if (items.length === 0) {
      alert('أضف صنفاً واحداً على الأقل');
      return;
    }
    addStockReceipt({
      representativeId: repId,
      representativeName: rep.name,
      items,
      date,
      notes,
      paidAmount
    } as any);
    setShow(false);
    reset();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">فواتير الشراء (استلام ودفع)</h2>
          <p className="text-sm text-slate-500">استلام أصناف من المندوب + تسجيل المبلغ المسدد في نفس الفاتورة</p>
        </div>
        <button onClick={() => { reset(); setShow(true); }} className="flex items-center gap-2 bg-secondary text-white px-4 py-2.5 rounded-xl font-medium hover:bg-emerald-600">
          <Plus className="w-4 h-4" /> فاتورة شراء جديدة
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
              <th className="text-right p-4">المندوب</th>
              <th className="text-right p-4">التاريخ</th>
              <th className="text-right p-4">الأصناف</th>
              <th className="text-right p-4">إجمالي الفاتورة</th>
              <th className="text-right p-4">المسدد</th>
              <th className="text-right p-4">إجراءات</th>
            </tr>
          </thead>
          <tbody>
            {list.length === 0 ? (
              <tr><td colSpan={6} className="p-8 text-center text-slate-400">لا توجد فواتير شراء</td></tr>
            ) : list.map(r => (
              <tr key={r.id} className="border-t border-slate-100 dark:border-slate-700">
                <td className="p-4 font-medium"><span className="flex items-center gap-2"><PackagePlus className="w-4 h-4 text-secondary" />{r.representativeName}</span></td>
                <td className="p-4">{formatDate(r.date)}</td>
                <td className="p-4 text-xs max-w-[220px]">{r.items.map(i => `${i.productName} (${i.quantity}×${i.unitCost || 0})`).join('، ')}</td>
                <td className="p-4 font-bold">{formatCurrency(r.totalValue || 0)}</td>
                <td className="p-4 text-green-600">{formatCurrency(r.paidAmount || 0)}</td>
                <td className="p-4">
                  <button onClick={() => deleteStockReceipt(r.id)} className="p-1.5 rounded-lg hover:bg-red-50"><Trash2 className="w-4 h-4 text-danger" /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {show && (
        <div className="fixed inset-0 bg-black/40 z-40 flex items-center justify-center p-4 overflow-y-auto" onClick={() => setShow(false)}>
          <form onClick={e => e.stopPropagation()} onSubmit={submit} className="bg-surface rounded-2xl p-6 w-full max-w-2xl shadow-xl space-y-4 my-6">
            <h3 className="text-lg font-bold">فاتورة شراء جديدة (استلام + دفع)</h3>

            <select required value={repId} onChange={e => setRepId(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-transparent outline-none focus:ring-2 focus:ring-secondary">
              <option value="">اختر اسم المندوب</option>
              {data.representatives.map(r => (
                <option key={r.id} value={r.id}>{r.name}{r.company ? ` — ${r.company}` : ''}</option>
              ))}
            </select>

            <input type="date" value={date} onChange={e => setDate(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-transparent outline-none" />

            <div className="border border-slate-200 dark:border-slate-600 rounded-xl p-4 space-y-3">
              <p className="text-sm font-medium">إضافة أصناف للفاتورة</p>
              <div className="relative">
                <input value={productSearch} onChange={e => setProductSearch(e.target.value)}
                  placeholder="ابحث عن اسم الصنف..."
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-transparent outline-none focus:ring-2 focus:ring-secondary text-sm" />
                {productSearch && filteredProducts.length > 0 && (
                  <div className="absolute z-10 mt-1 w-full bg-surface border border-slate-200 dark:border-slate-600 rounded-xl shadow-lg max-h-40 overflow-y-auto">
                    {filteredProducts.map(p => (
                      <button key={p.id} type="button"
                        onClick={() => { setSelectedProductId(p.id); setProductSearch(p.name); setUnitCost(p.purchasePrice || 0); }}
                        className="w-full text-right px-4 py-2 hover:bg-slate-50 dark:hover:bg-slate-800 text-sm">
                        {p.name} {p.company ? `— ${p.company}` : ''}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="grid grid-cols-3 gap-2">
                <input type="number" min={1} value={qty || ''} onChange={e => setQty(+e.target.value)}
                  placeholder="عدد العبوات" className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-transparent text-sm outline-none" />
                <input type="number" min={0} step={0.01} value={unitCost || ''} onChange={e => setUnitCost(+e.target.value)}
                  placeholder="سعر شراء العبوة" className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-transparent text-sm outline-none" />
                <button type="button" onClick={addLine} className="bg-secondary text-white rounded-xl text-sm font-medium flex items-center justify-center gap-1">
                  <Plus className="w-4 h-4" /> إضافة
                </button>
              </div>

              {items.length > 0 && (
                <table className="w-full text-sm mt-2">
                  <thead className="bg-slate-50 dark:bg-slate-800">
                    <tr>
                      <th className="text-right p-2">الصنف</th>
                      <th className="text-right p-2">العدد</th>
                      <th className="text-right p-2">سعر الشراء</th>
                      <th className="text-right p-2">الإجمالي</th>
                      <th className="p-2"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((i, idx) => (
                      <tr key={idx} className="border-t border-slate-100 dark:border-slate-700">
                        <td className="p-2">{i.productName}</td>
                        <td className="p-2">{i.quantity}</td>
                        <td className="p-2">{formatCurrency(i.unitCost)}</td>
                        <td className="p-2 font-medium">{formatCurrency(i.quantity * i.unitCost)}</td>
                        <td className="p-2">
                          <button type="button" onClick={() => setItems(items.filter((_, j) => j !== idx))} className="text-danger text-xs">حذف</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="font-bold border-t">
                      <td className="p-2" colSpan={3}>إجمالي الأصناف</td>
                      <td className="p-2 text-secondary">{formatCurrency(linesTotal)}</td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              )}
            </div>

            <input type="number" min={0} step={0.01} value={paidAmount || ''} onChange={e => setPaidAmount(+e.target.value)}
              placeholder="المبلغ المسدد للمندوب (اختياري)"
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-transparent outline-none focus:ring-2 focus:ring-secondary" />

            <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="ملاحظات"
              rows={2} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-transparent outline-none" />

            <div className="flex gap-3">
              <button type="submit" className="flex-1 bg-secondary text-white py-2.5 rounded-xl font-medium">حفظ الفاتورة</button>
              <button type="button" onClick={() => setShow(false)} className="flex-1 bg-slate-100 dark:bg-slate-700 py-2.5 rounded-xl">إلغاء</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
