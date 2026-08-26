import { Search, Moon, Sun, Bell, Plus, Menu } from 'lucide-react';
import { useApp } from '../store/AppContext';
import { useNavigate } from 'react-router-dom';

interface TopBarProps {
  /** يفتح القائمة الجانبية كدرج فوق الشاشة — يُستخدم فقط على الهاتف (الزر مخفي على الشاشات الكبيرة) */
  onOpenMobileNav: () => void;
}

export default function TopBar({ onOpenMobileNav }: TopBarProps) {
  const { darkMode, toggleDarkMode, trialDaysLeft, licenseValid } = useApp();
  const navigate = useNavigate();

  return (
    <header className="h-16 bg-surface border-b border-slate-200 dark:border-slate-700 flex items-center justify-between px-3 sm:px-6 shrink-0 gap-2">
      {/* زر فتح القائمة الجانبية — يظهر فقط على الهاتف (أصغر من md) */}
      <button
        onClick={onOpenMobileNav}
        className="md:hidden p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 shrink-0"
      >
        <Menu className="w-5 h-5" />
      </button>

      <div className="flex items-center gap-4 flex-1 max-w-xl min-w-0">
        <div className="relative w-full">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="بحث سريع في كل شيء..."
            autoComplete="off"
            className="w-full pr-10 pl-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border-0 focus:ring-2 focus:ring-secondary text-sm outline-none"
          />
        </div>
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
