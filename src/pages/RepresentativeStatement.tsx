import { useMemo, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowRight, FileText } from 'lucide-react';
import { useApp } from '../store/AppContext';
import { formatCurrency, formatDate } from '../lib/utils';
import { exportArabicTablePdf } from '../lib/pdf';

/**
 * كشف حساب مندوب محاسبي كامل (صفحة مستقلة)
 * مدين على المندوب = قيمة البضاعة المستلمة (بسعر وقت الاستلام)
 * دائن للمندوب = المرتجعات + المدفوعات
 * الرصيد = المستلم − المرتجعات − المدفوعات
 */
export default function RepresentativeStatement() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data } = useApp();
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const rep = data.representatives.find(r => r.id === id);

  const statement = useMemo(() => {
    if (!rep) return null;

    type Row = {
      date: string;
      type: string;
      ref: string;
      debit: number;
      credit: number;
      notes: string;
    };

    const rows: Row[] = [];

    const inRange = (d: string) => {
      if (fromDate && d < fromDate) return false;
      if (toDate && d > toDate) return false;
      return true;
    };

    for (const rec of (data.stockReceipts || []).filter(s => s.representativeId === rep.id)) {
      if (!inRange(rec.date)) continue;
      let val = 0;
      if (rec.totalValue != null && rec.totalValue > 0) {
        val = rec.totalValue;
      } else {
        for (const item of rec.items) {
          const unitCost = (item as any).unitCost != null
            ? (item as any).unitCost
            : (data.products.find(p => p.id === item.productId)?.purchasePrice || 0);
          val += unitCost * item.quantity;
        }
      }
      rows.push({
        date: rec.date,
        type: 'استلام بضاعة',
        ref: rec.id.slice(0, 8),
        debit: val,
        credit: 0,
        notes: rec.items.map(i => `${i.productName}×${i.quantity}`).join('، ') + (rec.notes ? ` | ${rec.notes}` : '')
      });
    }

    for (const ret of (data.representativeReturns || []).filter(r => r.representativeId === rep.id)) {
      if (!inRange(ret.date)) continue;
      rows.push({
        date: ret.date,
        type: 'مرتجع بضاعة',
        ref: ret.id.slice(0, 8),
        debit: 0,
        credit: ret.totalValue || 0,
        notes: ret.items.map(i => `${i.productName}×${i.quantity}`).join('، ') + (ret.notes ? ` | ${ret.notes}` : '')
      });
    }

    for (const pay of (data.payments || []).filter(p => p.representativeId === rep.id)) {
      if (!inRange(pay.date)) continue;
      rows.push({
        date: pay.date,
        type: 'دفعة',
        ref: pay.id.slice(0, 8),
        debit: 0,
        credit: pay.amount,
        notes: pay.notes || 'دفعة نقدية'
      });
    }

    rows.sort((a, b) => a.date.localeCompare(b.date) || a.type.localeCompare(b.type));

    let running = 0;
    const withBalance = rows.map(r => {
      running += r.debit - r.credit;
      return { ...r, balance: running };
    });

    const totalDebit = rows.reduce((s, r) => s + r.debit, 0);
    const totalCredit = rows.reduce((s, r) => s + r.credit, 0);

    return {
      rows: withBalance,
      totalDebit,
      totalCredit,
      balance: totalDebit - totalCredit
    };
  }, [rep, data, fromDate, toDate]);

  if (!rep) {
    return (
      <div className="text-center py-20">
        <p className="text-slate-500 mb-4">المندوب غير موجود</p>
        <Link to="/representatives" className="text-secondary hover:underline">العودة للمندوبين</Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/representatives')} className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800">
          <ArrowRight className="w-5 h-5" />
        </button>
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <FileText className="w-6 h-6 text-secondary" />
            كشف حساب مندوب
          </h2>
          <p className="text-sm text-slate-500">{rep.name} — {rep.phone} — {rep.region || 'بدون منطقة'}</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 items-end">
        <div>
          <label className="text-xs text-slate-500 block mb-1">من تاريخ</label>
          <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)}
            className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-transparent outline-none" />
        </div>
        <div>
          <label className="text-xs text-slate-500 block mb-1">إلى تاريخ</label>
          <input type="date" value={toDate} onChange={e => setToDate(e.target.value)}
            className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-transparent outline-none" />
        </div>
        {(fromDate || toDate) && (
          <button onClick={() => { setFromDate(''); setToDate(''); }}
            className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-700 text-sm">مسح الفلتر</button>
        )}
        <button onClick={() => window.print()}
          className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-700 text-sm">طباعة المتصفح</button>
        <button
          onClick={async () => {
            if (!statement) return;
            await exportArabicTablePdf({
              title: `كشف حساب مندوب — ${rep.name}`,
              companyName: data.settings?.name,
              subtitle: `${rep.phone || ''} | ${new Date().toLocaleString('ar-EG')}`,
              headers: ['التاريخ', 'النوع', 'المرجع', 'مدين', 'دائن', 'الرصيد', 'ملاحظات'],
              rows: statement.rows.map(r => [
                formatDate(r.date), r.type, r.ref,
                r.debit ? r.debit.toFixed(2) : '',
                r.credit ? r.credit.toFixed(2) : '',
                Number(r.balance).toFixed(2),
                r.notes || ''
              ]),
              fileName: `rep-statement-${rep.name}-${new Date().toISOString().slice(0, 10)}.pdf`,
              ltrColumns: [3, 4, 5]
            });
          }}
          className="mr-auto px-4 py-2 rounded-xl bg-slate-800 text-white text-sm hover:bg-slate-700"
        >
          تصدير PDF
        </button>
      </div>

      {statement && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-surface rounded-2xl p-5 shadow-soft border border-slate-100 dark:border-slate-700">
              <p className="text-sm text-slate-500">بضاعة مستلمة (مدين)</p>
              <p className="text-xl font-bold text-orange-600 mt-1">{formatCurrency(statement.totalDebit)}</p>
            </div>
            <div className="bg-surface rounded-2xl p-5 shadow-soft border border-slate-100 dark:border-slate-700">
              <p className="text-sm text-slate-500">مرتجعات + مدفوعات (دائن)</p>
              <p className="text-xl font-bold text-green-600 mt-1">{formatCurrency(statement.totalCredit)}</p>
            </div>
            <div className="bg-surface rounded-2xl p-5 shadow-soft border border-slate-100 dark:border-slate-700">
              <p className="text-sm text-slate-500">الرصيد المتبقي</p>
              <p className={`text-xl font-bold mt-1 ${statement.balance > 0 ? 'text-orange-600' : statement.balance < 0 ? 'text-blue-600' : 'text-slate-500'}`}>
                {formatCurrency(statement.balance)}
              </p>
              <p className="text-xs text-slate-400 mt-1">
                {statement.balance > 0 ? 'مستحق للمندوب / عليه بضاعة' : statement.balance < 0 ? 'دائن لصالح الشركة' : 'مسدد'}
              </p>
            </div>
          </div>

          <div className="bg-surface rounded-2xl shadow-soft border border-slate-100 dark:border-slate-700 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800">
                <tr>
                  <th className="text-right p-3 font-medium">التاريخ</th>
                  <th className="text-right p-3 font-medium">النوع</th>
                  <th className="text-right p-3 font-medium">المرجع</th>
                  <th className="text-right p-3 font-medium">مدين</th>
                  <th className="text-right p-3 font-medium">دائن</th>
                  <th className="text-right p-3 font-medium">الرصيد</th>
                  <th className="text-right p-3 font-medium">ملاحظات</th>
                </tr>
              </thead>
              <tbody>
                {statement.rows.length === 0 ? (
                  <tr><td colSpan={7} className="p-8 text-center text-slate-400">لا توجد حركات في هذه الفترة</td></tr>
                ) : statement.rows.map((r, i) => (
                  <tr key={i} className="border-t border-slate-100 dark:border-slate-700">
                    <td className="p-3">{formatDate(r.date)}</td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        r.type === 'استلام بضاعة' ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300' :
                        r.type === 'مرتجع بضاعة' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' :
                        'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300'
                      }`}>{r.type}</span>
                    </td>
                    <td className="p-3 font-mono text-xs">{r.ref}</td>
                    <td className="p-3 text-orange-600 font-medium">{r.debit ? formatCurrency(r.debit) : '—'}</td>
                    <td className="p-3 text-green-600 font-medium">{r.credit ? formatCurrency(r.credit) : '—'}</td>
                    <td className={`p-3 font-bold ${r.balance > 0 ? 'text-orange-600' : r.balance < 0 ? 'text-blue-600' : ''}`}>
                      {formatCurrency(r.balance)}
                    </td>
                    <td className="p-3 text-xs text-slate-500 max-w-[200px] truncate">{r.notes || '—'}</td>
                  </tr>
                ))}
              </tbody>
              {statement.rows.length > 0 && (
                <tfoot className="bg-slate-50 dark:bg-slate-800 font-bold">
                  <tr>
                    <td className="p-3" colSpan={3}>الإجمالي</td>
                    <td className="p-3 text-orange-600">{formatCurrency(statement.totalDebit)}</td>
                    <td className="p-3 text-green-600">{formatCurrency(statement.totalCredit)}</td>
                    <td className="p-3">{formatCurrency(statement.balance)}</td>
                    <td></td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>

          <p className="text-xs text-slate-400 text-center">
            الرصيد = قيمة البضاعة المستلمة (وقت الاستلام) − المرتجعات − المدفوعات
          </p>
        </>
      )}
    </div>
  );
}
