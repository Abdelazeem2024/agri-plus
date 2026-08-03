import { useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowRight, FileDown } from 'lucide-react';
import { useApp } from '../store/AppContext';
import { formatCurrency, formatDate } from '../lib/utils';
import { printRtlReport } from '../lib/pdf';

type Mode = 'summary' | 'detailed';

export default function CustomerStatement() {
  const { id } = useParams();
  const { data } = useApp();
  const [mode, setMode] = useState<Mode>('summary');
  const customer = data.customers.find(c => c.id === id);

  const statement = useMemo(() => {
    if (!customer) return { rows: [] as any[], balance: 0, opening: 0 };

    const opening = customer.openingBalance || 0;
    type Row = {
      date: string;
      desc: string;
      debit: number;
      credit: number;
      detail?: string;
      sort: string;
    };
    const rows: Row[] = [];

    if (opening !== 0) {
      rows.push({
        date: '',
        desc: 'رصيد افتتاحي',
        debit: opening > 0 ? opening : 0,
        credit: opening < 0 ? Math.abs(opening) : 0,
        sort: '0'
      });
    }

    for (const inv of data.invoices.filter(i => i.customerId === customer.id)) {
      const itemsDetail = inv.items.map(it => `${it.productName} (${it.quantity}×${it.unitPrice})`).join(' — ');
      rows.push({
        date: inv.date,
        desc: mode === 'detailed' ? `فاتورة ${inv.number}` : `فاتورة بيع ${inv.number}`,
        debit: inv.total,
        credit: 0,
        detail: mode === 'detailed'
          ? `الأصناف: ${itemsDetail} | إجمالي: ${inv.total}`
          : undefined,
        sort: inv.date + inv.createdAt
      });
    }

    for (const col of data.collections.filter(c => c.customerId === customer.id)) {
      rows.push({
        date: col.date,
        desc: 'تحصيل' + (col.notes ? ` — ${col.notes}` : ''),
        debit: 0,
        credit: col.amount,
        sort: col.date + (col.createdAt || '')
      });
    }

    for (const ret of data.returns.filter(r => r.customerId === customer.id)) {
      const itemsDetail = ret.items.map(it => `${it.productName} (${it.quantity})`).join(' — ');
      rows.push({
        date: ret.date,
        desc: mode === 'detailed' ? 'مرتجع' : 'مرتجع مبيعات',
        debit: 0,
        credit: ret.total,
        detail: mode === 'detailed' ? itemsDetail : undefined,
        sort: ret.date + (ret.createdAt || '')
      });
    }

    rows.sort((a, b) => a.sort.localeCompare(b.sort));
    let balance = 0;
    const withBalance = rows.map(r => {
      balance += r.debit - r.credit;
      return { ...r, balance };
    });

    return { rows: withBalance, balance, opening };
  }, [customer, data, mode]);

  if (!customer) {
    return (
      <div className="p-6">
        <p>العميل غير موجود</p>
        <Link to="/customers" className="text-secondary">عودة</Link>
      </div>
    );
  }

  const exportPdf = () => {
    if (mode === 'summary') {
      printRtlReport({
        title: `كشف حساب — ${customer.name} (إجمالي)`,
        companyName: data.settings?.name,
        companyPhone: data.settings?.phone,
        headers: ['التاريخ', 'البيان', 'مدين', 'دائن', 'الرصيد'],
        rows: statement.rows.map(r => [
          r.date ? formatDate(r.date) : '—',
          r.desc,
          r.debit ? formatCurrency(r.debit) : '',
          r.credit ? formatCurrency(r.credit) : '',
          formatCurrency(r.balance)
        ])
      });
    } else {
      printRtlReport({
        title: `كشف حساب تفصيلي — ${customer.name}`,
        companyName: data.settings?.name,
        companyPhone: data.settings?.phone,
        headers: ['التاريخ', 'البيان', 'التفاصيل / الأصناف', 'مدين', 'دائن', 'الرصيد'],
        rows: statement.rows.map(r => [
          r.date ? formatDate(r.date) : '—',
          r.desc,
          r.detail || '—',
          r.debit ? formatCurrency(r.debit) : '',
          r.credit ? formatCurrency(r.credit) : '',
          formatCurrency(r.balance)
        ])
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Link to="/customers" className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800">
            <ArrowRight className="w-5 h-5" />
          </Link>
          <div>
            <h2 className="text-2xl font-bold">كشف حساب: {customer.name}</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">{customer.phone}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={mode}
            onChange={e => setMode(e.target.value as Mode)}
            className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-transparent text-sm outline-none"
          >
            <option value="summary">إجمالي</option>
            <option value="detailed">تفصيلي</option>
          </select>
          <button onClick={exportPdf} className="flex items-center gap-2 bg-secondary text-white px-4 py-2 rounded-xl text-sm">
            <FileDown className="w-4 h-4" /> طباعة / PDF
          </button>
        </div>
      </div>

      <div className="bg-surface rounded-2xl p-4 border border-slate-100 dark:border-slate-700 flex justify-between items-center">
        <span className="text-slate-500 dark:text-slate-400">الرصيد الحالي</span>
        <span className={`text-xl font-bold ${statement.balance > 0 ? 'text-orange-500' : 'text-secondary'}`}>
          {formatCurrency(statement.balance)}
        </span>
      </div>

      <div className="bg-surface rounded-2xl shadow-soft border border-slate-100 dark:border-slate-700 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 dark:bg-slate-800">
            <tr>
              <th className="text-right p-3">التاريخ</th>
              <th className="text-right p-3">البيان</th>
              {mode === 'detailed' && <th className="text-right p-3">التفاصيل</th>}
              <th className="text-right p-3">مدين</th>
              <th className="text-right p-3">دائن</th>
              <th className="text-right p-3">الرصيد</th>
            </tr>
          </thead>
          <tbody>
            {statement.rows.length === 0 ? (
              <tr><td colSpan={mode === 'detailed' ? 6 : 5} className="p-8 text-center text-slate-400">لا توجد حركات</td></tr>
            ) : statement.rows.map((r, i) => (
              <tr key={i} className="border-t border-slate-100 dark:border-slate-700">
                <td className="p-3 whitespace-nowrap">{r.date ? formatDate(r.date) : '—'}</td>
                <td className="p-3 font-medium">{r.desc}</td>
                {mode === 'detailed' && <td className="p-3 text-xs text-slate-500 dark:text-slate-400 max-w-xs">{r.detail || '—'}</td>}
                <td className="p-3 text-orange-600 dark:text-orange-400">{r.debit ? formatCurrency(r.debit) : ''}</td>
                <td className="p-3 text-green-600 dark:text-green-400">{r.credit ? formatCurrency(r.credit) : ''}</td>
                <td className="p-3 font-bold">{formatCurrency(r.balance)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
