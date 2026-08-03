import { useState, useMemo } from 'react';
import { Lock, KeyRound } from 'lucide-react';
import { useApp } from '../store/AppContext';
import { formatCurrency, formatDate } from '../lib/utils';
import { appAlert, appConfirm } from '../lib/dialogs';

export default function Profits() {
  const { data, updateSettings } = useApp();
  const [unlocked, setUnlocked] = useState(false);
  const [password, setPassword] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  // إعداد كلمة المرور لأول مرة
  const needsSetup = !data.settings.profitPassword || data.settings.profitPassword === '';
  const [setupPass, setSetupPass] = useState('');
  const [setupConfirm, setSetupConfirm] = useState('');

  // تغيير كلمة المرور
  const [showChange, setShowChange] = useState(false);
  const [oldPass, setOldPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [newConfirm, setNewConfirm] = useState('');

  const handleSetup = (e: React.FormEvent) => {
    e.preventDefault();
    if (setupPass.length < 4) {
      appAlert('كلمة المرور يجب أن تكون 4 أحرف على الأقل');
      return;
    }
    if (setupPass !== setupConfirm) {
      appAlert('كلمتا المرور غير متطابقتين');
      return;
    }
    updateSettings({ profitPassword: setupPass });
    setUnlocked(true);
    setSetupPass('');
    setSetupConfirm('');
  };

  const handleUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === data.settings.profitPassword) {
      setUnlocked(true);
      setPassword('');
    } else {
      appAlert('كلمة المرور غير صحيحة');
    }
  };

  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (oldPass !== data.settings.profitPassword) {
      appAlert('كلمة المرور الحالية غير صحيحة');
      return;
    }
    if (newPass.length < 4) {
      appAlert('كلمة المرور الجديدة يجب أن تكون 4 أحرف على الأقل');
      return;
    }
    if (newPass !== newConfirm) {
      appAlert('تأكيد كلمة المرور غير متطابق');
      return;
    }
    updateSettings({ profitPassword: newPass });
    appAlert('تم تغيير كلمة المرور بنجاح');
    setShowChange(false);
    setOldPass('');
    setNewPass('');
    setNewConfirm('');
  };

  const filteredInvoices = data.invoices.filter(inv => {
    if (fromDate && inv.date < fromDate) return false;
    if (toDate && inv.date > toDate) return false;
    return true;
  });

  const sales = filteredInvoices.reduce((s, i) => s + i.total, 0);
  const cost = filteredInvoices.reduce((s, inv) => {
    return s + inv.items.reduce((is, item) => {
      if (item.costAtSale != null) return is + item.costAtSale * item.quantity;
      const product = data.products.find(p => p.id === item.productId);
      return is + (product ? product.purchasePrice * item.quantity : 0);
    }, 0);
  }, 0);
  const discounts = filteredInvoices.reduce((s, i) => s + (i.discount || 0), 0);
  const filteredReturns = data.returns.filter(r => (!fromDate || r.date >= fromDate) && (!toDate || r.date <= toDate));
  const returnsTotal = filteredReturns.reduce((s, r) => s + r.total, 0);
  const returnsCost = filteredReturns.reduce((s, r) => {
    if (r.totalCost != null) return s + r.totalCost;
    return s + r.items.reduce((is, item) => is + ((item as any).costAtSale || 0) * item.quantity, 0);
  }, 0);
  const netProfit = sales - cost - returnsTotal + returnsCost;

  // إعداد أول مرة
  if (needsSetup) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <form onSubmit={handleSetup} className="bg-surface rounded-2xl p-8 shadow-soft border border-slate-100 dark:border-slate-700 w-full max-w-md space-y-4">
          <div className="text-center">
            <KeyRound className="w-12 h-12 text-secondary mx-auto mb-3" />
            <h2 className="text-xl font-bold">تعيين كلمة مرور الأرباح</h2>
            <p className="text-sm text-slate-500 mt-2">لأول مرة — اختر كلمة مرور لحماية صفحة الأرباح</p>
          </div>
          <input type="password" value={setupPass} onChange={e => setSetupPass(e.target.value)}
            placeholder="كلمة المرور الجديدة" required
            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-transparent outline-none focus:ring-2 focus:ring-secondary" />
          <input type="password" value={setupConfirm} onChange={e => setSetupConfirm(e.target.value)}
            placeholder="تأكيد كلمة المرور" required
            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-transparent outline-none focus:ring-2 focus:ring-secondary" />
          <button type="submit" className="w-full bg-secondary text-white py-2.5 rounded-xl font-medium">حفظ</button>
        </form>
      </div>
    );
  }

  if (!unlocked) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <form onSubmit={handleUnlock} className="bg-surface rounded-2xl p-8 shadow-soft border border-slate-100 dark:border-slate-700 w-full max-w-sm space-y-4">
          <div className="text-center">
            <Lock className="w-12 h-12 text-secondary mx-auto mb-3" />
            <h2 className="text-xl font-bold">صفحة الأرباح</h2>
            <p className="text-sm text-slate-500 mt-1">أدخل كلمة المرور للمتابعة</p>
          </div>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)}
            placeholder="كلمة المرور" required autoFocus
            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-transparent outline-none focus:ring-2 focus:ring-secondary" />
          <button type="submit" className="w-full bg-secondary text-white py-2.5 rounded-xl font-medium">دخول</button>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold">الأرباح</h2>
          <p className="text-sm text-slate-500">تكلفة FIFO من فواتير الشراء − المبيعات</p>
        </div>
        <button onClick={() => setShowChange(true)} className="text-sm px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800">
          تغيير كلمة السر
        </button>
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
          <button onClick={() => { setFromDate(''); setToDate(''); }} className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-700 text-sm">مسح</button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[
          { label: 'إجمالي المبيعات', value: formatCurrency(sales), color: 'text-green-600 dark:text-green-400' },
          { label: 'تكلفة المبيعات (FIFO)', value: formatCurrency(cost), color: 'text-orange-600 dark:text-orange-400' },
          { label: 'الخصومات', value: formatCurrency(discounts), color: 'text-slate-600 dark:text-slate-300' },
          { label: 'قيمة المرتجعات', value: formatCurrency(returnsTotal), color: 'text-red-500 dark:text-red-400' },
          { label: 'تكلفة المرتجعات (معكوسة)', value: formatCurrency(returnsCost), color: 'text-blue-600 dark:text-blue-400' },
          { label: 'صافي الربح', value: formatCurrency(netProfit), color: netProfit >= 0 ? 'text-secondary' : 'text-red-500 dark:text-red-400' }
        ].map((c, i) => (
          <div key={i} className="bg-surface rounded-2xl p-5 shadow-soft border border-slate-100 dark:border-slate-700">
            <p className="text-sm text-slate-500">{c.label}</p>
            <p className={`text-xl font-bold mt-1 ${c.color}`}>{c.value}</p>
          </div>
        ))}
      </div>

      <div className="bg-surface rounded-2xl shadow-soft border border-slate-100 dark:border-slate-700 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 dark:bg-slate-800">
            <tr>
              <th className="text-right p-3">الفاتورة</th>
              <th className="text-right p-3">العميل</th>
              <th className="text-right p-3">التاريخ</th>
              <th className="text-right p-3">المبيعات</th>
              <th className="text-right p-3">التكلفة</th>
              <th className="text-right p-3">الربح</th>
            </tr>
          </thead>
          <tbody>
            {filteredInvoices.length === 0 ? (
              <tr><td colSpan={6} className="p-8 text-center text-slate-400">لا توجد فواتير في الفترة</td></tr>
            ) : filteredInvoices.map(inv => {
              const invCost = inv.items.reduce((s, item) => s + ((item.costAtSale ?? 0) * item.quantity), 0);
              const invProfit = inv.total - invCost;
              return (
                <tr key={inv.id} className="border-t border-slate-100 dark:border-slate-700">
                  <td className="p-3 font-mono text-xs">{inv.number}</td>
                  <td className="p-3">{inv.customerName}</td>
                  <td className="p-3">{formatDate(inv.date)}</td>
                  <td className="p-3">{formatCurrency(inv.total)}</td>
                  <td className="p-3">{formatCurrency(invCost)}</td>
                  <td className={`p-3 font-bold ${invProfit >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-400'}`}>
                    {formatCurrency(invProfit)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {showChange && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setShowChange(false)}>
          <form onClick={e => e.stopPropagation()} onSubmit={handleChangePassword}
            className="bg-surface rounded-2xl p-6 w-full max-w-md shadow-xl space-y-4 border border-slate-200 dark:border-slate-600">
            <h3 className="text-lg font-bold">تغيير كلمة مرور الأرباح</h3>
            <input type="password" value={oldPass} onChange={e => setOldPass(e.target.value)}
              placeholder="كلمة المرور الحالية" required
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-transparent outline-none focus:ring-2 focus:ring-secondary" />
            <input type="password" value={newPass} onChange={e => setNewPass(e.target.value)}
              placeholder="كلمة المرور الجديدة" required
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-transparent outline-none focus:ring-2 focus:ring-secondary" />
            <input type="password" value={newConfirm} onChange={e => setNewConfirm(e.target.value)}
              placeholder="تأكيد كلمة المرور الجديدة" required
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-transparent outline-none focus:ring-2 focus:ring-secondary" />
            <div className="flex gap-3">
              <button type="submit" className="flex-1 bg-secondary text-white py-2.5 rounded-xl font-medium">حفظ</button>
              <button type="button" onClick={() => setShowChange(false)} className="flex-1 bg-slate-100 dark:bg-slate-700 py-2.5 rounded-xl">إلغاء</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
