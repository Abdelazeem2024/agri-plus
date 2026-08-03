import { useState } from 'react';
import { Plus, Search, Trash2, Banknote, Pencil } from 'lucide-react';
import { useApp } from '../store/AppContext';
import { formatCurrency, formatDate } from '../lib/utils';
import type { Payment } from '../types';
import { appAlert, appConfirm } from '../lib/dialogs';

export default function RepPayments() {
  const { data, addPayment, deletePayment, updatePayment } = useApp();
  const [search, setSearch] = useState('');
  const [show, setShow] = useState(false);
  const [editing, setEditing] = useState<Payment | null>(null);
  const [repId, setRepId] = useState('');
  const [amount, setAmount] = useState(0);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');

  const list = (data.payments || [])
    .filter(p => p.representativeName.includes(search) || (p.notes || '').includes(search))
    .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));

  const resetForm = () => {
    setEditing(null);
    setRepId('');
    setAmount(0);
    setDate(new Date().toISOString().split('T')[0]);
    setNotes('');
  };

  const openAdd = () => {
    resetForm();
    setShow(true);
  };

  const openEdit = (p: Payment) => {
    setEditing(p);
    setRepId(p.representativeId);
    setAmount(p.amount);
    setDate(p.date);
    setNotes(p.notes || '');
    setShow(true);
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const rep = data.representatives.find(r => r.id === repId);
    if (!rep || amount <= 0) {
      appAlert('اختر مندوباً وأدخل مبلغاً صحيحاً');
      return;
    }

    if (editing) {
      updatePayment(editing.id, {
        representativeId: repId,
        representativeName: rep.name,
        amount,
        date,
        notes
      });
    } else {
      addPayment({
        representativeId: repId,
        representativeName: rep.name,
        amount,
        date,
        notes
      });
    }

    setShow(false);
    resetForm();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">مدفوعات المندوبين</h2>
          <p className="text-sm text-slate-500">
            {list.length} دفعة — الإجمالي {formatCurrency(list.reduce((s, p) => s + p.amount, 0))}
          </p>
        </div>
        <button onClick={openAdd} className="flex items-center gap-2 bg-secondary text-white px-4 py-2.5 rounded-xl font-medium hover:bg-emerald-600">
          <Plus className="w-4 h-4" /> تسجيل دفعة
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
              <th className="text-right p-4 font-medium">المبلغ</th>
              <th className="text-right p-4 font-medium">ملاحظات</th>
              <th className="text-right p-4 font-medium">إجراءات</th>
            </tr>
          </thead>
          <tbody>
            {list.length === 0 ? (
              <tr><td colSpan={5} className="p-8 text-center text-slate-400">لا توجد مدفوعات</td></tr>
            ) : list.map(p => (
              <tr key={p.id} className="border-t border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                <td className="p-4 font-medium">
                  <div className="flex items-center gap-2">
                    <Banknote className="w-4 h-4 text-secondary" />
                    {p.representativeName}
                  </div>
                </td>
                <td className="p-4">{formatDate(p.date)}</td>
                <td className="p-4 font-bold text-secondary">{formatCurrency(p.amount)}</td>
                <td className="p-4 text-slate-500">{p.notes || '—'}</td>
                <td className="p-4">
                  <div className="flex gap-2">
                    <button onClick={() => openEdit(p)} title="تعديل" className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700">
                      <Pencil className="w-4 h-4 text-slate-500" />
                    </button>
                    <button onClick={() => deletePayment(p.id)} title="حذف" className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/30">
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
        <div className="fixed inset-0 bg-black/40 z-40 flex items-center justify-center p-4" onClick={() => { setShow(false); resetForm(); }}>
          <form onClick={e => e.stopPropagation()} onSubmit={submit} className="bg-surface rounded-2xl p-6 w-full max-w-md shadow-xl space-y-4">
            <h3 className="text-lg font-bold">{editing ? 'تعديل دفعة' : 'تسجيل دفعة لمندوب'}</h3>
            <select required value={repId} onChange={e => setRepId(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-transparent outline-none focus:ring-2 focus:ring-secondary">
              <option value="">اختر المندوب</option>
              {data.representatives.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
            <input type="number" min={0.01} step={0.01} required value={amount || ''} onChange={e => setAmount(+e.target.value)}
              placeholder="المبلغ" className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-transparent outline-none focus:ring-2 focus:ring-secondary" />
            <input type="date" value={date} onChange={e => setDate(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-transparent outline-none" />
            <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="ملاحظات" rows={2}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-transparent outline-none" />
            <div className="flex gap-3">
              <button type="submit" className="flex-1 bg-secondary text-white py-2.5 rounded-xl font-medium">
                {editing ? 'حفظ التعديل' : 'حفظ'}
              </button>
              <button type="button" onClick={() => { setShow(false); resetForm(); }} className="flex-1 bg-slate-100 dark:bg-slate-700 py-2.5 rounded-xl">إلغاء</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
