import { Link } from 'react-router-dom';
import { useState } from 'react';
import { Plus, Search, Pencil, Trash2, FileText, X } from 'lucide-react';
import { useApp } from '../store/AppContext';
import type { Representative } from '../types';
import { formatCurrency, formatDate } from '../lib/utils';

export default function Representatives() {
  const { data, addRepresentative, updateRepresentative, deleteRepresentative } = useApp();
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Representative | null>(null);
  const [form, setForm] = useState({ name: '', phone: '', region: '', notes: '' });
  const [statementRep, setStatementRep] = useState<Representative | null>(null);

  const filtered = data.representatives.filter(r =>
    r.name.includes(search) || r.phone.includes(search) || r.region.includes(search)
  );

  const openAdd = () => { setEditing(null); setForm({ name: '', phone: '', region: '', notes: '' }); setShowForm(true); };
  const openEdit = (r: Representative) => {
    setEditing(r);
    setForm({ name: r.name, phone: r.phone, region: r.region, notes: r.notes });
    setShowForm(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    if (editing) updateRepresentative(editing.id, form);
    else addRepresentative(form);
    setShowForm(false);
  };

  // حساب رصيد المندوب بالقيم المحفوظة وقت العملية (لا بسعر الشراء الحالي)
  // الرصيد = قيمة البضاعة المستلمة - قيمة المرتجعات - المدفوعات
  const getRepBalance = (repId: string) => {
    const receipts = (data.stockReceipts || []).filter(s => s.representativeId === repId);
    const returns = (data.representativeReturns || []).filter(r => r.representativeId === repId);
    const payments = (data.payments || []).filter(p => p.representativeId === repId);

    let receivedValue = 0;
    for (const rec of receipts) {
      if (rec.totalValue != null && rec.totalValue > 0) {
        receivedValue += rec.totalValue;
      } else {
        // توافق مع بيانات قديمة بدون totalValue
        for (const item of rec.items) {
          const unitCost = (item as any).unitCost != null
            ? (item as any).unitCost
            : (data.products.find(p => p.id === item.productId)?.purchasePrice || 0);
          receivedValue += unitCost * item.quantity;
        }
      }
    }

    const returnedValue = returns.reduce((s, r) => s + (r.totalValue || 0), 0);
    const paid = payments.reduce((s, p) => s + p.amount, 0);

    return {
      receivedValue,
      returnedValue,
      paid,
      balance: receivedValue - returnedValue - paid
    };
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">المندوبين</h2>
          <p className="text-sm text-slate-500">{data.representatives.length} مندوب</p>
        </div>
        <button onClick={openAdd} className="flex items-center gap-2 bg-secondary text-white px-4 py-2.5 rounded-xl font-medium hover:bg-emerald-600">
          <Plus className="w-4 h-4" /> إضافة مندوب
        </button>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="بحث..."
          className="w-full pr-10 pl-4 py-2.5 rounded-xl bg-surface border border-slate-200 dark:border-slate-700 outline-none focus:ring-2 focus:ring-secondary text-sm" />
      </div>

      <div className="bg-surface rounded-2xl shadow-soft border border-slate-100 dark:border-slate-700 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 dark:bg-slate-800">
            <tr>
              <th className="text-right p-4 font-medium">الاسم</th>
              <th className="text-right p-4 font-medium">الهاتف</th>
              <th className="text-right p-4 font-medium">المنطقة</th>
              <th className="text-right p-4 font-medium">الرصيد</th>
              <th className="text-right p-4 font-medium">إجراءات</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={5} className="p-8 text-center text-slate-400">لا يوجد مندوبين</td></tr>
            ) : filtered.map(r => {
              const bal = getRepBalance(r.id);
              return (
                <tr key={r.id} className="border-t border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                  <td className="p-4 font-medium">{r.name}</td>
                  <td className="p-4">{r.phone}</td>
                  <td className="p-4">{r.region || '—'}</td>
                  <td className="p-4">
                    <span className={`font-bold ${bal.balance > 0 ? 'text-orange-600' : bal.balance < 0 ? 'text-green-600' : 'text-slate-500'}`}>
                      {formatCurrency(bal.balance)}
                    </span>
                  </td>
                  <td className="p-4">
                    <div className="flex gap-2">
                      <Link to={`/representatives/${r.id}/statement`} title="كشف حساب كامل" className="p-1.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/30">
                        <FileText className="w-4 h-4 text-blue-500" />
                      </Link>
                      <button onClick={() => openEdit(r)} className="p-1.5 rounded-lg hover:bg-slate-100"><Pencil className="w-4 h-4 text-slate-500" /></button>
                      <button onClick={() => confirm('حذف؟') && deleteRepresentative(r.id)} className="p-1.5 rounded-lg hover:bg-red-50"><Trash2 className="w-4 h-4 text-danger" /></button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 z-40 flex items-center justify-center p-4" onClick={() => setShowForm(false)}>
          <form onClick={e => e.stopPropagation()} onSubmit={handleSubmit} className="bg-surface rounded-2xl p-6 w-full max-w-md shadow-xl space-y-4">
            <h3 className="text-lg font-bold">{editing ? 'تعديل مندوب' : 'إضافة مندوب'}</h3>
            <input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="الاسم *" className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-transparent outline-none focus:ring-2 focus:ring-secondary" />
            <input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="الهاتف" className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-transparent outline-none focus:ring-2 focus:ring-secondary" />
            <input value={form.region} onChange={e => setForm({ ...form, region: e.target.value })} placeholder="المنطقة" className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-transparent outline-none focus:ring-2 focus:ring-secondary" />
            <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="ملاحظات" rows={2} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-transparent outline-none focus:ring-2 focus:ring-secondary" />
            <div className="flex gap-3">
              <button type="submit" className="flex-1 bg-secondary text-white py-2.5 rounded-xl font-medium">حفظ</button>
              <button type="button" onClick={() => setShowForm(false)} className="flex-1 bg-slate-100 dark:bg-slate-700 py-2.5 rounded-xl font-medium">إلغاء</button>
            </div>
          </form>
        </div>
      )}

      {/* كشف حساب المندوب */}
      {statementRep && (() => {
        const bal = getRepBalance(statementRep.id);
        const receipts = (data.stockReceipts || []).filter(s => s.representativeId === statementRep.id);
        const returns = (data.representativeReturns || []).filter(r => r.representativeId === statementRep.id);
        const payments = (data.payments || []).filter(p => p.representativeId === statementRep.id);

        // دمج الحركات بالتاريخ
        type Movement = { date: string; type: string; description: string; amount: number; sign: number };
        const movements: Movement[] = [];

        receipts.forEach(rec => {
          let val = 0;
          if (rec.totalValue != null && rec.totalValue > 0) {
            val = rec.totalValue;
          } else {
            rec.items.forEach(item => {
              const unitCost = (item as any).unitCost != null
                ? (item as any).unitCost
                : (data.products.find(pr => pr.id === item.productId)?.purchasePrice || 0);
              val += unitCost * item.quantity;
            });
          }
          movements.push({
            date: rec.date,
            type: 'استلام بضاعة',
            description: rec.items.map(i => `${i.productName} (${i.quantity})`).join('، '),
            amount: val,
            sign: 1
          });
        });

        returns.forEach(ret => {
          movements.push({
            date: ret.date,
            type: 'مرتجع بضاعة',
            description: ret.items.map(i => `${i.productName} (${i.quantity})`).join('، '),
            amount: ret.totalValue,
            sign: -1
          });
        });

        payments.forEach(pay => {
          movements.push({
            date: pay.date,
            type: 'دفعة',
            description: pay.notes || 'دفعة نقدية',
            amount: pay.amount,
            sign: -1
          });
        });

        movements.sort((a, b) => a.date.localeCompare(b.date));

        return (
          <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setStatementRep(null)}>
            <div onClick={e => e.stopPropagation()} className="bg-surface rounded-2xl p-6 w-full max-w-2xl shadow-xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-xl font-bold">كشف حساب المندوب</h3>
                  <p className="text-sm text-slate-500">{statementRep.name} — {statementRep.phone}</p>
                </div>
                <button onClick={() => setStatementRep(null)} className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* ملخص الرصيد */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-3 text-center">
                  <p className="text-xs text-slate-500">بضاعة مستلمة</p>
                  <p className="font-bold text-green-600">{formatCurrency(bal.receivedValue)}</p>
                </div>
                <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-3 text-center">
                  <p className="text-xs text-slate-500">مرتجعات</p>
                  <p className="font-bold text-orange-600">{formatCurrency(bal.returnedValue)}</p>
                </div>
                <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-3 text-center">
                  <p className="text-xs text-slate-500">مدفوعات</p>
                  <p className="font-bold text-blue-600">{formatCurrency(bal.paid)}</p>
                </div>
                <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-3 text-center">
                  <p className="text-xs text-slate-500">الرصيد المتبقي</p>
                  <p className={`font-bold text-lg ${bal.balance > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                    {formatCurrency(bal.balance)}
                  </p>
                </div>
              </div>

              <h4 className="font-bold mb-3">تفاصيل الحركات</h4>
              {movements.length === 0 ? (
                <p className="text-center text-slate-400 py-6">لا توجد حركات بعد</p>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 dark:bg-slate-800">
                    <tr>
                      <th className="text-right p-3">التاريخ</th>
                      <th className="text-right p-3">النوع</th>
                      <th className="text-right p-3">التفاصيل</th>
                      <th className="text-right p-3">المبلغ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {movements.map((m, i) => (
                      <tr key={i} className="border-t border-slate-100 dark:border-slate-700">
                        <td className="p-3">{formatDate(m.date)}</td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                            m.type === 'استلام بضاعة' ? 'bg-green-100 text-green-700' :
                            m.type === 'مرتجع بضاعة' ? 'bg-orange-100 text-orange-700' :
                            'bg-blue-100 text-blue-700'
                          }`}>{m.type}</span>
                        </td>
                        <td className="p-3 text-xs text-slate-500">{m.description}</td>
                        <td className={`p-3 font-medium ${m.sign > 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {m.sign > 0 ? '+' : '-'}{formatCurrency(m.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              <div className="mt-4 text-xs text-slate-400 text-center">
                الرصيد = البضاعة المستلمة − المرتجعات − المدفوعات
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
