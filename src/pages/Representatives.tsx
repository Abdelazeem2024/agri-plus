import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, Pencil, Trash2, FileText, Phone } from 'lucide-react';
import { useApp } from '../store/AppContext';
import type { Representative } from '../types';
import { formatCurrency } from '../lib/utils';

export default function Representatives() {
  const { data, addRepresentative, updateRepresentative, deleteRepresentative } = useApp();
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Representative | null>(null);
  const [form, setForm] = useState({ name: '', phone: '', company: '' });

  const filtered = data.representatives.filter(r =>
    r.name.includes(search) || r.phone.includes(search) || (r.company || '').includes(search)
  );

  const getRepBalance = (repId: string) => {
    const receipts = (data.stockReceipts || []).filter(s => s.representativeId === repId);
    const returns = (data.representativeReturns || []).filter(r => r.representativeId === repId);
    const payments = (data.payments || []).filter(p => p.representativeId === repId);
    let receivedValue = 0;
    for (const rec of receipts) {
      if (rec.totalValue != null && rec.totalValue > 0) receivedValue += rec.totalValue;
      else {
        for (const item of rec.items) {
          receivedValue += (item.unitCost || 0) * item.quantity;
        }
      }
    }
    const returnedValue = returns.reduce((s, r) => s + (r.totalValue || 0), 0);
    const paid = payments.reduce((s, p) => s + p.amount, 0);
    return { receivedValue, returnedValue, paid, balance: receivedValue - returnedValue - paid };
  };

  const openAdd = () => {
    setEditing(null);
    setForm({ name: '', phone: '', company: '' });
    setShowForm(true);
  };

  const openEdit = (r: Representative) => {
    setEditing(r);
    setForm({ name: r.name, phone: r.phone, company: r.company || '' });
    setShowForm(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      alert('أدخل اسم المندوب');
      return;
    }
    if (editing) {
      updateRepresentative(editing.id, { ...form, region: editing.region || '', notes: editing.notes || '' });
    } else {
      addRepresentative({ ...form, region: '', notes: '' });
    }
    setShowForm(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">المندوبون</h2>
          <p className="text-sm text-slate-500">{data.representatives.length} مندوب</p>
        </div>
        <button onClick={openAdd} className="flex items-center gap-2 bg-secondary text-white px-4 py-2.5 rounded-xl font-medium hover:bg-emerald-600">
          <Plus className="w-4 h-4" /> إضافة مندوب
        </button>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="بحث بالاسم أو الهاتف أو الشركة..."
          className="w-full pr-10 pl-4 py-2.5 rounded-xl bg-surface border border-slate-200 dark:border-slate-700 outline-none focus:ring-2 focus:ring-secondary text-sm" />
      </div>

      <div className="bg-surface rounded-2xl shadow-soft border border-slate-100 dark:border-slate-700 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 dark:bg-slate-800">
            <tr>
              <th className="text-right p-4 font-medium">الاسم</th>
              <th className="text-right p-4 font-medium">الهاتف</th>
              <th className="text-right p-4 font-medium">الشركة</th>
              <th className="text-right p-4 font-medium">الرصيد</th>
              <th className="text-right p-4 font-medium">إجراءات</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={5} className="p-8 text-center text-slate-400">لا يوجد مندوبون</td></tr>
            ) : filtered.map(r => {
              const bal = getRepBalance(r.id);
              return (
                <tr key={r.id} className="border-t border-slate-100 dark:border-slate-700">
                  <td className="p-4 font-medium">{r.name}</td>
                  <td className="p-4"><span className="flex items-center gap-1"><Phone className="w-3.5 h-3.5 text-slate-400" />{r.phone || '—'}</span></td>
                  <td className="p-4">{r.company || '—'}</td>
                  <td className={`p-4 font-bold ${bal.balance > 0 ? 'text-orange-600' : 'text-slate-500'}`}>{formatCurrency(bal.balance)}</td>
                  <td className="p-4">
                    <div className="flex gap-2">
                      <Link to={`/representatives/${r.id}/statement`} title="كشف حساب" className="p-1.5 rounded-lg hover:bg-blue-50">
                        <FileText className="w-4 h-4 text-blue-500" />
                      </Link>
                      <button onClick={() => openEdit(r)} className="p-1.5 rounded-lg hover:bg-slate-100"><Pencil className="w-4 h-4 text-slate-500" /></button>
                      <button onClick={() => deleteRepresentative(r.id)} className="p-1.5 rounded-lg hover:bg-red-50"><Trash2 className="w-4 h-4 text-danger" /></button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/40 z-40 flex items-center justify-center p-4" onClick={() => setShowForm(false)}>
          <form onClick={e => e.stopPropagation()} onSubmit={handleSubmit} className="bg-surface rounded-2xl p-6 w-full max-w-md shadow-xl space-y-4">
            <h3 className="text-lg font-bold">{editing ? 'تعديل مندوب' : 'إضافة مندوب'}</h3>
            <input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
              placeholder="اسم المندوب" className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-transparent outline-none focus:ring-2 focus:ring-secondary" />
            <input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })}
              placeholder="رقم الهاتف" className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-transparent outline-none focus:ring-2 focus:ring-secondary" />
            <input value={form.company} onChange={e => setForm({ ...form, company: e.target.value })}
              placeholder="اسم الشركة" className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-transparent outline-none focus:ring-2 focus:ring-secondary" />
            <div className="flex gap-3">
              <button type="submit" className="flex-1 bg-secondary text-white py-2.5 rounded-xl font-medium">حفظ</button>
              <button type="button" onClick={() => setShowForm(false)} className="flex-1 bg-slate-100 dark:bg-slate-700 py-2.5 rounded-xl">إلغاء</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
