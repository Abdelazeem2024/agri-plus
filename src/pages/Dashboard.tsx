import { Users, UserCheck, Package, TrendingUp, Wallet, RotateCcw, AlertTriangle, FileText, Sparkles, ArrowLeft } from 'lucide-react';
import { useApp } from '../store/AppContext';
import { formatCurrency, formatDate } from '../lib/utils';
import { Link } from 'react-router-dom';

export default function Dashboard() {
  const { data } = useApp();

  const totalSales = data.invoices.reduce((s, i) => s + i.total, 0);
  const totalCollections = data.collections.reduce((s, c) => s + c.amount, 0);
  const totalReturns = data.returns.reduce((s, r) => s + r.total, 0);
  const lowStock = data.products.filter(p => p.currentStock <= p.minStock);

  const cards = [
    { label: 'العملاء', value: data.customers.length, icon: Users, color: 'bg-blue-500' },
    { label: 'المندوبين', value: data.representatives.length, icon: UserCheck, color: 'bg-indigo-500' },
    { label: 'الأصناف', value: data.products.length, icon: Package, color: 'bg-emerald-500' },
    { label: 'إجمالي المبيعات', value: formatCurrency(totalSales), icon: TrendingUp, color: 'bg-green-600' },
    { label: 'إجمالي التحصيلات', value: formatCurrency(totalCollections), icon: Wallet, color: 'bg-teal-500' },
    { label: 'إجمالي المرتجعات', value: formatCurrency(totalReturns), icon: RotateCcw, color: 'bg-orange-500' }
  ];

  const recentInvoices = [...data.invoices].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 5);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-800 dark:text-white">لوحة التحكم</h2>
        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">نظرة عامة على نشاطك اليوم</p>
      </div>

      {/* زر/بطاقة الدخول للمساعد الذكي — نقطة الدخول الرئيسية له في البرنامج */}
      <Link
        to="/ai-assistant"
        className="group relative overflow-hidden rounded-2xl bg-gradient-to-l from-slate-900 via-emerald-900 to-slate-900 p-5 flex items-center justify-between shadow-lg hover:shadow-emerald-900/30 transition-shadow"
      >
        <div className="absolute -left-6 -top-6 w-32 h-32 rounded-full bg-emerald-500/10 blur-2xl" />
        <div className="relative flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 to-secondary flex items-center justify-center shadow-md shrink-0">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <div>
            <p className="font-bold text-white">اسأل مساعد Agri Plus الذكي</p>
            <p className="text-xs text-emerald-200/80 mt-0.5">أرباح، مديونيات، مخزون، مبيعات — بجملة عادية بالعربي</p>
          </div>
        </div>
        <ArrowLeft className="relative w-5 h-5 text-emerald-200/60 group-hover:-translate-x-1 transition-transform shrink-0" />
      </Link>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {cards.map((c, i) => (
          <div key={i} className="bg-surface rounded-2xl p-5 shadow-soft border border-slate-100 dark:border-slate-700 flex items-center gap-4">
            <div className={`w-12 h-12 rounded-xl ${c.color} flex items-center justify-center text-white shrink-0`}>
              <c.icon className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-slate-500 dark:text-slate-400">{c.label}</p>
              <p className="text-xl font-bold text-slate-800 dark:text-white">{c.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Low stock alerts */}
        <div className="bg-surface rounded-2xl p-5 shadow-soft border border-slate-100 dark:border-slate-700">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            <h3 className="font-bold text-slate-800 dark:text-white">تنبيهات المخزون</h3>
          </div>
          {lowStock.length === 0 ? (
            <p className="text-sm text-slate-500">لا توجد تنبيهات حالياً</p>
          ) : (
            <ul className="space-y-2">
              {lowStock.slice(0, 6).map(p => (
                <li key={p.id} className="flex justify-between text-sm py-2 border-b border-slate-100 dark:border-slate-700 last:border-0">
                  <span className="font-medium">{p.name}</span>
                  <span className="text-danger font-bold">{p.currentStock} {p.unit}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Recent invoices */}
        <div className="bg-surface rounded-2xl p-5 shadow-soft border border-slate-100 dark:border-slate-700">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-secondary" />
              <h3 className="font-bold text-slate-800 dark:text-white">آخر الفواتير</h3>
            </div>
            <Link to="/invoices" className="text-sm text-secondary hover:underline">عرض الكل</Link>
          </div>
          {recentInvoices.length === 0 ? (
            <p className="text-sm text-slate-500">لا توجد فواتير بعد</p>
          ) : (
            <ul className="space-y-2">
              {recentInvoices.map(inv => (
                <li key={inv.id} className="flex justify-between text-sm py-2 border-b border-slate-100 dark:border-slate-700 last:border-0">
                  <div>
                    <span className="font-medium">{inv.number}</span>
                    <span className="text-slate-400 mr-2">• {inv.customerName}</span>
                  </div>
                  <div className="text-left">
                    <span className="font-bold text-secondary">{formatCurrency(inv.total)}</span>
                    <p className="text-xs text-slate-400">{formatDate(inv.date)}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { to: '/customers', label: 'إضافة عميل', color: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' },
          { to: '/invoices/new', label: 'فاتورة جديدة', color: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' },
          { to: '/products', label: 'إضافة صنف', color: 'bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' },
          { to: '/reports', label: 'التقارير', color: 'bg-orange-50 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300' }
        ].map(a => (
          <Link key={a.to} to={a.to} className={`rounded-xl p-4 text-center font-medium text-sm ${a.color} hover:opacity-80 transition-opacity`}>
            {a.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
