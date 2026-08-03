import { useState } from 'react';
import { Plus, Search, Pencil, Trash2, AlertTriangle } from 'lucide-react';
import { useApp } from '../store/AppContext';
import type { Product } from '../types';

const emptyForm = {
  name: '',
  activeIngredient: '',
  company: '',
  minStock: 0,
  // defaults kept for data model
  tradeName: '',
  concentration: '',
  unit: 'عبوة',
  purchasePrice: 0,
  salePrice: 0,
  category: 'insecticide' as const,
  notes: ''
};

export default function Products() {
  const { data, addProduct, updateProduct, deleteProduct } = useApp();
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState(emptyForm);

  const filtered = data.products.filter(p =>
    p.name.includes(search) || p.activeIngredient.includes(search) || p.company.includes(search)
  );

  const openAdd = () => {
    setEditing(null);
    setForm(emptyForm);
    setShowForm(true);
  };

  const openEdit = (p: Product) => {
    setEditing(p);
    setForm({
      name: p.name,
      activeIngredient: p.activeIngredient,
      company: p.company,
      minStock: p.minStock,
      tradeName: p.tradeName,
      concentration: p.concentration,
      unit: p.unit,
      purchasePrice: p.purchasePrice,
      salePrice: p.salePrice,
      category: p.category as typeof emptyForm.category,
      notes: p.notes
    });
    setShowForm(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      alert('أدخل اسم الصنف');
      return;
    }
    if (editing) {
      updateProduct(editing.id, form);
    } else {
      addProduct(form);
    }
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
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="بحث باسم الصنف أو المادة أو الشركة..."
          className="w-full pr-10 pl-4 py-2.5 rounded-xl bg-surface border border-slate-200 dark:border-slate-700 outline-none focus:ring-2 focus:ring-secondary text-sm" />
      </div>

      <div className="bg-surface rounded-2xl shadow-soft border border-slate-100 dark:border-slate-700 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 dark:bg-slate-800">
            <tr>
              <th className="text-right p-4 font-medium">اسم الصنف</th>
              <th className="text-right p-4 font-medium">المادة الفعالة</th>
              <th className="text-right p-4 font-medium">الشركة</th>
              <th className="text-right p-4 font-medium">المخزون</th>
              <th className="text-right p-4 font-medium">الحد الأدنى</th>
              <th className="text-right p-4 font-medium">إجراءات</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={6} className="p-8 text-center text-slate-400">لا توجد أصناف</td></tr>
            ) : filtered.map(p => (
              <tr key={p.id} className="border-t border-slate-100 dark:border-slate-700">
                <td className="p-4 font-medium">{p.name}</td>
                <td className="p-4">{p.activeIngredient || '—'}</td>
                <td className="p-4">{p.company || '—'}</td>
                <td className="p-4">
                  <div className="flex items-center gap-1">
                    {p.currentStock <= p.minStock && <AlertTriangle className="w-4 h-4 text-amber-500" />}
                    <span className={p.currentStock <= p.minStock ? 'text-danger font-bold' : ''}>{p.currentStock}</span>
                  </div>
                </td>
                <td className="p-4">{p.minStock}</td>
                <td className="p-4">
                  <div className="flex gap-2">
                    <button onClick={() => openEdit(p)} className="p-1.5 rounded-lg hover:bg-slate-100"><Pencil className="w-4 h-4 text-slate-500" /></button>
                    <button onClick={() => deleteProduct(p.id)} className="p-1.5 rounded-lg hover:bg-red-50"><Trash2 className="w-4 h-4 text-danger" /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/40 z-40 flex items-center justify-center p-4" onClick={() => setShowForm(false)}>
          <form onClick={e => e.stopPropagation()} onSubmit={handleSubmit} className="bg-surface rounded-2xl p-6 w-full max-w-md shadow-xl space-y-4">
            <h3 className="text-lg font-bold">{editing ? 'تعديل صنف' : 'إضافة صنف جديد'}</h3>
            <input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
              placeholder="اسم الصنف" className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-transparent outline-none focus:ring-2 focus:ring-secondary" />
            <input value={form.activeIngredient} onChange={e => setForm({ ...form, activeIngredient: e.target.value })}
              placeholder="المادة الفعالة" className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-transparent outline-none focus:ring-2 focus:ring-secondary" />
            <input value={form.company} onChange={e => setForm({ ...form, company: e.target.value })}
              placeholder="اسم الشركة" className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-transparent outline-none focus:ring-2 focus:ring-secondary" />
            <input type="number" min={0} value={form.minStock || ''} onChange={e => setForm({ ...form, minStock: +e.target.value })}
              placeholder="الحد الأدنى من المخزون" className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-transparent outline-none focus:ring-2 focus:ring-secondary" />
            <div className="flex gap-3 pt-2">
              <button type="submit" className="flex-1 bg-secondary text-white py-2.5 rounded-xl font-medium">حفظ</button>
              <button type="button" onClick={() => setShowForm(false)} className="flex-1 bg-slate-100 dark:bg-slate-700 py-2.5 rounded-xl">إلغاء</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
