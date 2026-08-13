import { useState } from 'react';
import { Plus, Search, Trash2, Wallet } from 'lucide-react';
import { useApp } from '../store/AppContext';
import { formatCurrency, formatDate } from '../lib/utils';
import { appAlert, appConfirm } from '../lib/dialogs';

export default function Collections() {
  const { data, addCollection, deleteCollection } = useApp();
  const [search, setSearch] = useState('');
  const [show, setShow] = useState(false);
  const [customerId, setCustomerId] = useState('');
  const [amount, setAmount] = useState(0);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');

  const list = data.collections
    .filter(c => c.customerName.includes(search) || c.notes.includes(search))
    .sort((a, b) => b.date.localeCompare(a.date));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const customer = data.customers.find(c => c.id === customerId);
    if (!customer || amount <= 0) {
      appAlert('اختر عميلاً وأدخل مبلغاً صحيحاً');
      return;
    }
    addCollection({ customerId, customerName: customer.name, amount, date, notes });
    setShow(false);
    setCustomerId('');
    setAmount(0);
    setNotes('');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">التحصيلات</h2>
          <p className="text-sm text-slate-500">{data.collections.length} تحصيل — الإجمالي {formatCurrency(data.collections.reduce((s, c) => s + c.amount, 0))}</p>
        </div>
        <button onClick={() => setShow(true)} className="flex items-center gap-2 bg-secondary text-white px-4 py-2.5 rounded-xl font-medium hover:bg-emerald-600">
          <Plus className="w-4 h-4" /> تسجيل تحصيل
        </button>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="بحث..."
          autoComplete="off"
          className="w-full pr-10 pl-4 py-2.5 rounded-xl bg-surface border border-slate-200 dark:border-slate-700 outline-none focus:ring-2 focus:ring-secondary text-sm" />
      </div>

      <div className="bg-surface rounded-2xl shadow-soft border border-slate-100 dark:border-slate-700 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 dark:bg-slate-800">
            <tr>
              <th className="text-right p-4">العميل</th>
              <th className="text-right p-4">التاريخ</th>
              <th className="text-right p-4">المبلغ</th>
              <th className="text-right p-4">ملاحظات</th>
              <th className="text-right p-4">إجراءات</th>
            </tr>
          </thead>
          <tbody>
            {list.length === 0 ? (
              <tr><td colSpan={5} className="p-8 text-center text-slate-400">لا توجد تحصيلات</td></tr>
            ) : list.map(c => (
              <tr key={c.id} className="border-t border-slate-100 dark:border-slate-700">
                <td className="p-4 font-medium flex items-center gap-2"><Wallet className="w-4 h-4 text-secondary" />{c.customerName}</td>
                <td className="p-4">{formatDate(c.date)}</td>
                <td className="p-4 font-bold text-secondary">{formatCurrency(c.amount)}</td>
                <td className="p-4 text-slate-500">{c.notes || '—'}</td>
                <td className="p-4">
                  <button onClick={() => deleteCollection(c.id)} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/30">
                    <Trash2 className="w-4 h-4 text-danger" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {show && (
        <div className="fixed inset-0 bg-black/40 z-40 flex items-center justify-center p-4" onClick={() => setShow(false)}>
          <form onClick={e => e.stopPropagation()} onSubmit={submit} className="bg-surface rounded-2xl p-6 w-full max-w-md shadow-xl space-y-4">
            <h3 className="text-lg font-bold">تسجيل تحصيل</h3>
            <select required value={customerId} onChange={e => setCustomerId(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-transparent outline-none focus:ring-2 focus:ring-secondary">
              <option value="">اختر العميل</option>
              {data.customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <input type="number" min={0.01} step={0.01} required value={amount || ''} onChange={e => setAmount(+e.target.value)}
              placeholder="المبلغ" className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-transparent outline-none focus:ring-2 focus:ring-secondary" />
            <input type="date" value={date} onChange={e => setDate(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-transparent outline-none" />
            <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="ملاحظات" rows={2}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-transparent outline-none" />
            <div className="flex gap-3">
              <button type="submit" className="flex-1 bg-secondary text-white py-2.5 rounded-xl font-medium">حفظ</button>
              <button type="button" onClick={() => setShow(false)} className="flex-1 bg-slate-100 dark:bg-slate-700 py-2.5 rounded-xl">إلغاء</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
