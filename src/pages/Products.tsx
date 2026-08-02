import { useState } from 'react';
import { Plus, Search, Pencil, Trash2, AlertTriangle } from 'lucide-react';
import { useApp } from '../store/AppContext';
import type { Product, ProductCategory } from '../types';
import { PRODUCT_CATEGORIES, formatCurrency } from '../lib/utils';

const emptyForm = {
  name: '', tradeName: '', activeIngredient: '', concentration: '', company: '',
  unit: 'عبوة', purchasePrice: 0, salePrice: 0, minStock: 5,
  category: 'insecticide' as ProductCategory, notes: ''
};

export default function Products() {
  const { data, addProduct, updateProduct, deleteProduct } = useApp();
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState(emptyForm);

  const filtered = data.products.filter(p =>
    p.name.includes(search) || p.tradeName.includes(search) ||
    p.activeIngredient.includes(search) || p.company.includes(search)
  );

  const openAdd = () => { setEditing(null); setForm(emptyForm); setShowForm(true); };
  const openEdit = (p: Product) => {
    setEditing(p);
    setForm({
      name: p.name, tradeName: p.tradeName, activeIngredient: p.activeIngredient,
      concentration: p.concentration, company: p.company, unit: p.unit,
      purchasePrice: p.purchasePrice, salePrice: p.salePrice, minStock: p.minStock,
      category: p.category, notes: p.notes
    });
    setShowForm(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    if (editing) updateProduct(editing.id, form);
    else addProduct(form);
    setShowForm(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">الأصناف والمخزون</h2>
          <p className="text-sm text-slate-500">{data.products.length} صنف</p>
        </div>
        <button onClick={openAdd} className="flex items-center gap-2 bg-secondary text-white px-4 py-2.5 rounded-xl font-medium hover:bg-emerald-600">
          <Plus className="w-4 h-4" /> إضافة صنف
        </button>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="بحث بالاسم أو المادة الفعالة أو الشركة..."
          className="w-full pr-10 pl-4 py-2.5 rounded-xl bg-surface border border-slate-200 dark:border-slate-700 outline-none focus:ring-2 focus:ring-secondary text-sm" />
      </div>

      <div className="bg-surface rounded-2xl shadow-soft border border-slate-100 dark:border-slate-700 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 dark:bg-slate-800 text-slate-600">
            <tr>
              <th className="text-right p-4 font-medium">الصنف</th>
              <th className="text-right p-4 font-medium">المادة الفعالة</th>
              <th className="text-right p-4 font-medium">التصنيف</th>
              <th className="text-right p-4 font-medium">سعر البيع</th>
              <th className="text-right p-4 font-medium">المخزون</th>
              <th className="text-right p-4 font-medium">إجراءات</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={6} className="p-8 text-center text-slate-400">لا توجد أصناف</td></tr>
            ) : filtered.map(p => (
              <tr key={p.id} className="border-t border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                <td className="p-4">
                  <div className="font-medium">{p.name}</div>
                  <div className="text-xs text-slate-400">{p.tradeName}</div>
                </td>
                <td className="p-4">{p.activeIngredient} {p.concentration && `(${p.concentration})`}</td>
                <td className="p-4">{PRODUCT_CATEGORIES[p.category]}</td>
                <td className="p-4 font-medium">{formatCurrency(p.salePrice)}</td>
                <td className="p-4">
                  <div className="flex items-center gap-1">
                    {p.currentStock <= p.minStock && <AlertTriangle className="w-4 h-4 text-amber-500" />}
                    <span className={p.currentStock <= p.minStock ? 'text-danger font-bold' : ''}>
                      {p.currentStock} {p.unit}
                    </span>
                  </div>
                </td>
                <td className="p-4">
                  <div className="flex gap-2">
                    <button onClick={() => openEdit(p)} className="p-1.5 rounded-lg hover:bg-slate-100"><Pencil className="w-4 h-4 text-slate-500" /></button>
                    <button onClick={() => confirm('حذف؟') && deleteProduct(p.id)} className="p-1.5 rounded-lg hover:bg-red-50"><Trash2 className="w-4 h-4 text-danger" /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/40 z-40 flex items-center justify-center p-4 overflow-y-auto" onClick={() => setShowForm(false)}>
          <form onClick={e => e.stopPropagation()} onSubmit={handleSubmit} className="bg-surface rounded-2xl p-6 w-full max-w-lg shadow-xl space-y-3 my-8">
            <h3 className="text-lg font-bold mb-2">{editing ? 'تعديل صنف' : 'إضافة صنف جديد'}</h3>
            <div className="grid grid-cols-2 gap-3">
              <input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="اسم الصنف *" className="col-span-2 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-transparent outline-none focus:ring-2 focus:ring-secondary" />
              <input value={form.tradeName} onChange={e => setForm({ ...form, tradeName: e.target.value })} placeholder="الاسم التجاري" className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-transparent outline-none focus:ring-2 focus:ring-secondary" />
              <input value={form.activeIngredient} onChange={e => setForm({ ...form, activeIngredient: e.target.value })} placeholder="المادة الفعالة" className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-transparent outline-none focus:ring-2 focus:ring-secondary" />
              <input value={form.concentration} onChange={e => setForm({ ...form, concentration: e.target.value })} placeholder="التركيز" className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-transparent outline-none focus:ring-2 focus:ring-secondary" />
              <input value={form.company} onChange={e => setForm({ ...form, company: e.target.value })} placeholder="الشركة المنتجة" className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-transparent outline-none focus:ring-2 focus:ring-secondary" />
              <input value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })} placeholder="الوحدة" className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-transparent outline-none focus:ring-2 focus:ring-secondary" />
              <input type="number" value={form.purchasePrice} onChange={e => setForm({ ...form, purchasePrice: +e.target.value })} placeholder="سعر الشراء" className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-transparent outline-none focus:ring-2 focus:ring-secondary" />
              <input type="number" value={form.salePrice} onChange={e => setForm({ ...form, salePrice: +e.target.value })} placeholder="سعر البيع" className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-transparent outline-none focus:ring-2 focus:ring-secondary" />
              <input type="number" value={form.minStock} onChange={e => setForm({ ...form, minStock: +e.target.value })} placeholder="الحد الأدنى" className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-transparent outline-none focus:ring-2 focus:ring-secondary" />
              <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value as ProductCategory })} className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-transparent outline-none focus:ring-2 focus:ring-secondary">
                {Object.entries(PRODUCT_CATEGORIES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="ملاحظات" rows={2} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-transparent outline-none focus:ring-2 focus:ring-secondary" />
            <div className="flex gap-3 pt-2">
              <button type="submit" className="flex-1 bg-secondary text-white py-2.5 rounded-xl font-medium">حفظ</button>
              <button type="button" onClick={() => setShowForm(false)} className="flex-1 bg-slate-100 dark:bg-slate-700 py-2.5 rounded-xl font-medium">إلغاء</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
