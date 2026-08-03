import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, Users, UserCheck, Package, FileText,
  BarChart3, Lock, Settings, Leaf, RotateCcw, Wallet, PackagePlus
} from 'lucide-react';
import { cn } from '../lib/utils';

const links = [
  { to: '/', icon: LayoutDashboard, label: 'الرئيسية' },
  { to: '/customers', icon: Users, label: 'العملاء' },
  { to: '/collections', icon: Wallet, label: 'التحصيلات' },
  { to: '/customer-returns', icon: RotateCcw, label: 'مرتجعات العملاء' },
  { to: '/representatives', icon: UserCheck, label: 'إدارة المندوبين' },
  { to: '/stock-receipts', icon: PackagePlus, label: 'فواتير الشراء' },
  { to: '/representative-returns', icon: RotateCcw, label: 'مرتجعات المندوبين' },
  { to: '/products', icon: Package, label: 'الأصناف والمخزون' },
  { to: '/invoices', icon: FileText, label: 'فواتير البيع' },
  { to: '/reports', icon: BarChart3, label: 'التقارير' },
  { to: '/profits', icon: Lock, label: 'الأرباح' },
  { to: '/settings', icon: Settings, label: 'الإعدادات' }
];

export default function Sidebar() {
  return (
    <aside className="w-64 bg-primary text-white flex flex-col h-full shrink-0 shadow-xl">
      <div className="p-5 border-b border-white/10 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center">
          <Leaf className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="font-bold text-lg leading-tight">Agri Plus</h1>
          <p className="text-xs text-white/60">إدارة ذكية... ونمو مستمر</p>
        </div>
      </div>
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {links.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all',
                isActive
                  ? 'bg-secondary text-white shadow-md'
                  : 'text-white/70 hover:bg-white/10 hover:text-white'
              )
            }
          >
            <Icon className="w-5 h-5 shrink-0" />
            <span className="truncate">{label}</span>
          </NavLink>
        ))}
      </nav>
      <div className="p-4 border-t border-white/10 text-center text-xs text-white/40">
        الإصدار 1.7.1
      </div>
    </aside>
  );
}
