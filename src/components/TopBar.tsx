import { Search, Moon, Sun, Bell, Plus } from 'lucide-react';
import { useApp } from '../store/AppContext';
import { useNavigate } from 'react-router-dom';

export default function TopBar() {
  const { darkMode, toggleDarkMode, trialDaysLeft, licenseValid } = useApp();
  const navigate = useNavigate();

  return (
    <header className="h-16 bg-surface border-b border-slate-200 dark:border-slate-700 flex items-center justify-between px-6 shrink-0">
      <div className="flex items-center gap-4 flex-1 max-w-xl">
        <div className="relative w-full">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="بحث سريع في كل شيء..."
            className="w-full pr-10 pl-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border-0 focus:ring-2 focus:ring-secondary text-sm outline-none"
          />
        </div>
      </div>

      <div className="flex items-center gap-3">
        {!licenseValid && (
          <span className="text-xs bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200 px-3 py-1 rounded-full font-medium">
            متبقي {trialDaysLeft} أيام تجريبية
          </span>
        )}

        <button
          onClick={() => navigate('/invoices/new')}
          className="flex items-center gap-2 bg-secondary hover:bg-emerald-600 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors"
        >
          <Plus className="w-4 h-4" />
          فاتورة جديدة
        </button>

        <button
          onClick={toggleDarkMode}
          className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>

        <button className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 relative">
          <Bell className="w-5 h-5" />
        </button>
      </div>
    </header>
  );
}
