import { Link } from 'react-router-dom';
import { useState } from 'react';
import { Plus, Search, Pencil, Trash2, Phone, MapPin, FileText } from 'lucide-react';
import { useApp } from '../store/AppContext';
import type { Customer } from '../types';
import { appAlert, appConfirm } from '../lib/dialogs';

export default function Customers() {
  const { data, addCustomer, updateCustomer, deleteCustomer } = useApp();
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [form, setForm] = useState<{ name: string; phone: string; address: string; region: string; notes: string; status: 'active' | 'inactive'; openingBalance: number }>({ name: '', phone: '', address: '', region: '', notes: '', status: 'active', openingBalance: 0 });

  const filtered = data.customers.filter(c =>
    c.name.includes(search) || c.phone.includes(search) || c.region.includes(search)
  );

  const openAdd = () => {
    setEditing(null);
    setForm({ name: '', phone: '', address: '', region: '', notes: '', status: 'active', openingBalance: 0 });
    setShowForm(true);
  };

  const openEdit = (c: Customer) => {
    setEditing(c);
    setForm({ name: c.name, phone: c.phone, address: c.address, region: c.region, notes: c.notes, status: c.status, openingBalance: c.openingBalance || 0 });
    setShowForm(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    if (editing) {
      updateCustomer(editing.id, form);
    } else {
      addCustomer(form);
    }
    setShowForm(false);
  };

  const handleDelete = (id: string) => {
    if (appConfirm('هل أنت متأكد من حذف هذا العميل؟')) deleteCustomer(id);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">العملاء</h2>
          <p className="text-sm text-slate-500">{data.customers.length} عميل</p>
        </div>
        <button onClick={openAdd} className="flex items-center gap-2 bg-secondary text-white px-4 py-2.5 rounded-xl font-medium hover:bg-emerald-600 transition-colors">
          <Plus className="w-4 h-4" /> إضافة عميل
        </button>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="بحث بالاسم أو الهاتف أو المنطقة..."
          className="w-full pr-10 pl-4 py-2.5 rounded-xl bg-surface border border-slate-200 dark:border-slate-700 outline-none focus:ring-2 focus:ring-secondary text-sm"
        />
      </div>

      <div className="bg-surface rounded-2xl shadow-soft border border-slate-100 dark:border-slate-700 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
            <tr>
              <th className="text-right p-4 font-medium">الاسم</th>
              <th className="text-right p-4 font-medium">الهاتف</th>
              <th className="text-right p-4 font-medium">المنطقة</th>
              <th className="text-right p-4 font-medium">الحالة</th>
              <th className="text-right p-4 font-medium">إجراءات</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={5} className="p-8 text-center text-slate-400">لا يوجد عملاء</td></tr>
            ) : filtered.map(c => (
              <tr key={c.id} className="border-t border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                <td className="p-4 font-medium">{c.name}</td>
                <td className="p-4"><div className="flex items-center gap-1"><Phone className="w-3.5 h-3.5 text-slate-400" />{c.phone}</div></td>
                <td className="p-4"><div className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5 text-slate-400" />{c.region || '—'}</div></td>
                <td className="p-4">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${c.status === 'active' ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300' : 'bg-slate-100 text-slate-600'}`}>
                    {c.status === 'active' ? 'نشط' : 'متوقف'}
                  </span>
                </td>
                <td className="p-4">
                  <div className="flex gap-2">
                    <Link to={`/customers/${c.id}/statement`} title="كشف حساب" className="p-1.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/30">
                      <FileText className="w-4 h-4 text-blue-500" />
                    </Link>
                    <button onClick={() => openEdit(c)} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"><Pencil className="w-4 h-4 text-slate-500" /></button>
                    <button onClick={() => handleDelete(c.id)} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/30"><Trash2 className="w-4 h-4 text-danger" /></button>
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
            <h3 className="text-lg font-bold">{editing ? 'تعديل عميل' : 'إضافة عميل جديد'}</h3>
            <input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="اسم العميل *" className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-transparent outline-none focus:ring-2 focus:ring-secondary" />
            <input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="رقم الهاتف" className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-transparent outline-none focus:ring-2 focus:ring-secondary" />
            <input value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} placeholder="العنوان" className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-transparent outline-none focus:ring-2 focus:ring-secondary" />
            <input value={form.region} onChange={e => setForm({ ...form, region: e.target.value })} placeholder="المنطقة" className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-transparent outline-none focus:ring-2 focus:ring-secondary" />
            <input type="number" step="0.01" value={form.openingBalance} onChange={e => setForm({ ...form, openingBalance: +e.target.value })} placeholder="رصيد افتتاحي / مديونية قديمة (إن وجدت)" className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-transparent outline-none focus:ring-2 focus:ring-secondary" />
            <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="ملاحظات" rows={2} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-transparent outline-none focus:ring-2 focus:ring-secondary" />
            <div className="flex gap-3 pt-2">
              <button type="submit" className="flex-1 bg-secondary text-white py-2.5 rounded-xl font-medium hover:bg-emerald-600">حفظ</button>
              <button type="button" onClick={() => setShowForm(false)} className="flex-1 bg-slate-100 dark:bg-slate-700 py-2.5 rounded-xl font-medium">إلغاء</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
