import { useState } from 'react';
import { useApp } from '../store/AppContext';
import { formatCurrency } from '../lib/utils';
import { Lock } from 'lucide-react';

export default function Profits() {
  const { data } = useApp();
  const [unlocked, setUnlocked] = useState(false);
  const [password, setPassword] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const handleUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === data.settings.profitPassword || password === '1234') {
      setUnlocked(true);
    } else {
      alert('كلمة المرور غير صحيحة');
    }
  };

  if (!unlocked) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <form onSubmit={handleUnlock} className="bg-surface rounded-2xl p-8 shadow-soft border border-slate-100 dark:border-slate-700 w-full max-w-sm text-center space-y-4">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
            <Lock className="w-8 h-8 text-slate-500" />
          </div>
          <h2 className="text-xl font-bold">صفحة الأرباح محمية</h2>
          <p className="text-sm text-slate-500">أدخل كلمة المرور للوصول</p>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)}
            placeholder="كلمة المرور" autoFocus
            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-transparent outline-none focus:ring-2 focus:ring-secondary text-center" />
          <button type="submit" className="w-full bg-secondary text-white py-2.5 rounded-xl font-medium hover:bg-emerald-600">
            دخول
          </button>
          <p className="text-xs text-slate-400">الافتراضي: 1234</p>
        </form>
      </div>
    );
  }

  const filteredInvoices = data.invoices.filter(inv => {
    if (fromDate && inv.date < fromDate) return false;
    if (toDate && inv.date > toDate) return false;
    return true;
  });

  const sales = filteredInvoices.reduce((s, i) => s + i.total, 0);
  const discounts = filteredInvoices.reduce((s, i) => s + i.discount, 0);
  // التكلفة من costAtSale المحفوظة وقت البيع (إن وُجدت)، وإلا سعر الشراء الحالي كاحتياطي
  const cost = filteredInvoices.reduce((s, inv) => {
    return s + inv.items.reduce((is, item) => {
      if (item.costAtSale != null) {
        return is + item.costAtSale * item.quantity;
      }
      const p = data.products.find(pr => pr.id === item.productId);
      return is + (p ? p.purchasePrice * item.quantity : 0);
    }, 0);
  }, 0);
  const filteredReturns = data.returns
    .filter(r => (!fromDate || r.date >= fromDate) && (!toDate || r.date <= toDate));
  const returnsTotal = filteredReturns.reduce((s, r) => s + r.total, 0);
  // تكلفة الوحدات المرتجعة — تُضاف للربح لأنها عكست تكلفة كانت محسوبة على المبيعات
  const returnsCost = filteredReturns.reduce((s, r) => {
    if (r.totalCost != null) return s + r.totalCost;
    return s + r.items.reduce((is, item) => is + ((item as any).costAtSale || 0) * item.quantity, 0);
  }, 0);

  // صافي الربح = (المبيعات - المرتجعات) - (تكلفة المبيعات - تكلفة المرتجعات)
  // = المبيعات - التكلفة - المرتجعات + تكلفة_المرتجعات
  const netProfit = sales - cost - returnsTotal + returnsCost;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">الأرباح</h2>
        <p className="text-sm text-slate-500">تحليل الربحية حسب الفترة</p>
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
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[
          { label: 'إجمالي المبيعات', value: formatCurrency(sales), color: 'text-green-600' },
          { label: 'تكلفة المبيعات', value: formatCurrency(cost), color: 'text-orange-600' },
          { label: 'الخصومات', value: formatCurrency(discounts), color: 'text-slate-600' },
          { label: 'قيمة المرتجعات', value: formatCurrency(returnsTotal), color: 'text-red-600' },
          { label: 'تكلفة المرتجعات (معكوسة)', value: formatCurrency(returnsCost), color: 'text-blue-600' },
          { label: 'صافي الربح', value: formatCurrency(netProfit), color: netProfit >= 0 ? 'text-secondary' : 'text-danger' }
        ].map((c, i) => (
          <div key={i} className="bg-surface rounded-2xl p-5 shadow-soft border border-slate-100 dark:border-slate-700">
            <p className="text-sm text-slate-500">{c.label}</p>
            <p className={`text-2xl font-bold mt-1 ${c.color}`}>{c.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
