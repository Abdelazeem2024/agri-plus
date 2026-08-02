import { useState } from 'react';
import { Plus, Search, Trash2, FileText, Pencil } from 'lucide-react';
import { useApp } from '../store/AppContext';
import { formatCurrency, formatDate } from '../lib/utils';
import { Link } from 'react-router-dom';

export default function Invoices() {
  const { data, deleteInvoice } = useApp();
  const [search, setSearch] = useState('');

  const filtered = data.invoices.filter(i =>
    i.number.includes(search) || i.customerName.includes(search)
  ).sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">فواتير البيع</h2>
          <p className="text-sm text-slate-500">{data.invoices.length} فاتورة</p>
        </div>
        <Link to="/invoices/new" className="flex items-center gap-2 bg-secondary text-white px-4 py-2.5 rounded-xl font-medium hover:bg-emerald-600">
          <Plus className="w-4 h-4" /> فاتورة جديدة
        </Link>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="بحث برقم الفاتورة أو العميل..."
          className="w-full pr-10 pl-4 py-2.5 rounded-xl bg-surface border border-slate-200 dark:border-slate-700 outline-none focus:ring-2 focus:ring-secondary text-sm" />
      </div>

      <div className="bg-surface rounded-2xl shadow-soft border border-slate-100 dark:border-slate-700 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 dark:bg-slate-800">
            <tr>
              <th className="text-right p-4 font-medium">رقم الفاتورة</th>
              <th className="text-right p-4 font-medium">العميل</th>
              <th className="text-right p-4 font-medium">التاريخ</th>
              <th className="text-right p-4 font-medium">الإجمالي</th>
              <th className="text-right p-4 font-medium">إجراءات</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={5} className="p-8 text-center text-slate-400">لا توجد فواتير</td></tr>
            ) : filtered.map(inv => (
              <tr key={inv.id} className="border-t border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                <td className="p-4 font-medium flex items-center gap-2"><FileText className="w-4 h-4 text-secondary" />{inv.number}</td>
                <td className="p-4">{inv.customerName}</td>
                <td className="p-4">{formatDate(inv.date)}</td>
                <td className="p-4 font-bold text-secondary">{formatCurrency(inv.total)}</td>
                <td className="p-4">
                  <div className="flex gap-2">
                    <Link to={`/invoices/${inv.id}/edit`} className="p-1.5 rounded-lg hover:bg-slate-100" title="تعديل">
                      <Pencil className="w-4 h-4 text-slate-500" />
                    </Link>
                    <button onClick={() => deleteInvoice(inv.id)} className="p-1.5 rounded-lg hover:bg-red-50" title="حذف">
                      <Trash2 className="w-4 h-4 text-danger" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
