import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, Users, UserCheck, Package, FileText,
  BarChart3, Lock, Settings, Leaf, RotateCcw, Wallet, PackagePlus, Sparkles, X
} from 'lucide-react';
import { cn } from '../lib/utils';

const links = [
  { to: '/', icon: LayoutDashboard, label: 'الرئيسية' },
  { to: '/ai-assistant', icon: Sparkles, label: 'المساعد الذكي', highlight: true },
  { to: '/customers', icon: Users, label: 'العملاء' },
  { to: '/invoices', icon: FileText, label: 'فواتير البيع' },
  { to: '/collections', icon: Wallet, label: 'التحصيلات' },
  { to: '/customer-returns', icon: RotateCcw, label: 'مرتجعات العملاء' },
  { to: '/representatives', icon: UserCheck, label: 'إدارة المندوبين' },
  { to: '/stock-receipts', icon: PackagePlus, label: 'فواتير الشراء' },
  { to: '/representative-returns', icon: RotateCcw, label: 'مرتجعات المندوبين' },
  { to: '/products', icon: Package, label: 'الأصناف والمخزون' },
  { to: '/reports', icon: BarChart3, label: 'التقارير' },
  { to: '/profits', icon: Lock, label: 'الأرباح' },
  { to: '/settings', icon: Settings, label: 'الإعدادات' }
];

interface SidebarProps {
  /** مفتوحة كـ"درج" فوق الشاشة على الهاتف؟ (على الشاشات الكبيرة تبقى ظاهرة دائماً بغض النظر عن هذه القيمة) */
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

export default function Sidebar({ mobileOpen, onCloseMobile }: SidebarProps) {
  return (
    <>
      {/* الخلفية الشفافة خلف الدرج على الهاتف فقط — تُغلق القائمة عند الضغط عليها */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 md:hidden"
          onClick={onCloseMobile}
        />
      )}

      <aside
        className={cn(
          'bg-primary text-white flex flex-col h-full shrink-0 shadow-xl w-64',
          // على الهاتف: درج ثابت الموضع ينزلق من اليمين (التطبيق RTL)، مخفي افتراضياً
          'fixed inset-y-0 right-0 z-50 transition-transform duration-300 md:relative md:translate-x-0 md:z-auto',
          mobileOpen ? 'translate-x-0' : 'translate-x-full'
        )}
      >
        <div className="p-5 border-b border-white/10 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center shrink-0">
            <Leaf className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="font-bold text-lg leading-tight">Agri Plus</h1>
            <p className="text-xs text-white/60">إدارة ذكية... ونمو مستمر</p>
          </div>
          {/* زر إغلاق الدرج — يظهر فقط على الهاتف */}
          <button onClick={onCloseMobile} className="md:hidden p-1.5 rounded-lg hover:bg-white/10 shrink-0">
            <X className="w-5 h-5" />
          </button>
        </div>
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {links.map(({ to, icon: Icon, label, highlight }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              onClick={onCloseMobile}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all',
                  isActive
                    ? highlight
                      ? 'bg-gradient-to-l from-amber-400 to-secondary text-white shadow-md'
                      : 'bg-secondary text-white shadow-md'
                    : highlight
                      ? 'text-amber-200 hover:bg-white/10 hover:text-amber-100'
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
          الإصدار 1.7.5
        </div>
      </aside>
    </>
  );
}
