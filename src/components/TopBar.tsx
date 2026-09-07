import { Moon, Sun, Bell, Plus, Menu, ArrowRight } from 'lucide-react';
import { useApp } from '../store/AppContext';
import { useNavigate, useLocation } from 'react-router-dom';
import GlobalSearch from './GlobalSearch';

interface TopBarProps {
  onOpenMobileNav: () => void;
}

export default function TopBar({ onOpenMobileNav }: TopBarProps) {
  const { darkMode, toggleDarkMode, trialDaysLeft, licenseValid } = useApp();
  const navigate = useNavigate();
  const location = useLocation();
  const isHome = location.pathname === '/';

  return (
    <header className="h-16 bg-surface border-b border-slate-200 dark:border-slate-700 flex items-center justify-between px-3 sm:px-6 shrink-0 gap-2">
      <div className="flex items-center gap-1 shrink-0">
        {!isHome && (
          <button
            onClick={() => navigate(-1)}
            title="رجوع للصفحة السابقة"
            className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <ArrowRight className="w-5 h-5" />
          </button>
        )}
        <button
          onClick={onOpenMobileNav}
          className="md:hidden p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800"
        >
          <Menu className="w-5 h-5" />
        </button>
      </div>

      <div className="flex items-center gap-4 flex-1 max-w-xl min-w-0">
        <GlobalSearch />
      </div>

      <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
        {!licenseValid && (
          <span className="hidden sm:inline text-xs bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200 px-3 py-1 rounded-full font-medium">
            متبقي {trialDaysLeft} أيام تجريبية
          </span>
        )}

        <button
          onClick={() => navigate('/invoices/new')}
          className="flex items-center gap-2 bg-secondary hover:bg-emerald-600 text-white px-3 sm:px-4 py-2 rounded-xl text-sm font-medium transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">فاتورة جديدة</span>
        </button>

        <button
          onClick={toggleDarkMode}
          className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>

        <button className="hidden sm:inline-flex p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 relative">
          <Bell className="w-5 h-5" />
        </button>
      </div>
    </header>
  );
}
