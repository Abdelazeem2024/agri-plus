import { useState, useMemo, useRef, useEffect } from 'react';
import { Search, Moon, Sun, Bell, Plus, Users, Package, FileText, UserCheck } from 'lucide-react';
import { useApp } from '../store/AppContext';
import { useNavigate } from 'react-router-dom';

interface SearchResult {
  id: string;
  type: 'customer' | 'product' | 'representative' | 'invoice';
  label: string;
  sub: string;
  go: () => void;
}

export default function TopBar() {
  const { darkMode, toggleDarkMode, trialDaysLeft, licenseValid, data } = useApp();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const boxRef = useRef<HTMLDivElement>(null);

  const results = useMemo<SearchResult[]>(() => {
    const q = query.trim();
    if (!q) return [];
    const out: SearchResult[] = [];

    for (const c of data.customers) {
      if (c.name.includes(q) || (c.phone && c.phone.includes(q))) {
        out.push({ id: c.id, type: 'customer', label: c.name, sub: c.phone || 'عميل', go: () => navigate(`/customers/${c.id}/statement`) });
      }
      if (out.filter(r => r.type === 'customer').length >= 5) break;
    }
    for (const r of data.representatives) {
      if (r.name.includes(q) || (r.phone && r.phone.includes(q))) {
        out.push({ id: r.id, type: 'representative', label: r.name, sub: r.phone || 'مندوب', go: () => navigate(`/representatives/${r.id}/statement`) });
      }
      if (out.filter(x => x.type === 'representative').length >= 5) break;
    }
    for (const p of data.products) {
      if (p.name.includes(q) || (p.tradeName && p.tradeName.includes(q))) {
        out.push({ id: p.id, type: 'product', label: p.name, sub: p.tradeName || 'صنف', go: () => navigate('/products') });
      }
      if (out.filter(x => x.type === 'product').length >= 5) break;
    }
    for (const inv of data.invoices) {
      if (inv.number.includes(q) || inv.customerName.includes(q)) {
        out.push({ id: inv.id, type: 'invoice', label: inv.number, sub: inv.customerName, go: () => navigate(`/invoices/${inv.id}/edit`) });
      }
      if (out.filter(x => x.type === 'invoice').length >= 5) break;
    }

    return out.slice(0, 15);
  }, [query, data, navigate]);

  useEffect(() => { setActiveIndex(0); }, [query]);

  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  const pick = (r: SearchResult) => {
    r.go();
    setQuery('');
    setOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open || results.length === 0) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIndex(i => Math.min(i + 1, results.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIndex(i => Math.max(i - 1, 0)); }
    else if (e.key === 'Enter') { e.preventDefault(); pick(results[activeIndex]); }
    else if (e.key === 'Escape') { setOpen(false); }
  };

  const typeIcon = { customer: Users, product: Package, representative: UserCheck, invoice: FileText } as const;
  const typeLabel = { customer: 'عميل', product: 'صنف', representative: 'مندوب', invoice: 'فاتورة' } as const;

  return (
    <header className="h-16 bg-surface border-b border-slate-200 dark:border-slate-700 flex items-center justify-between px-6 shrink-0">
      <div className="flex items-center gap-4 flex-1 max-w-xl">
        <div className="relative w-full" ref={boxRef}>
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 z-10" />
          <input
            type="text"
            value={query}
            onChange={e => { setQuery(e.target.value); setOpen(true); }}
            onFocus={() => query && setOpen(true)}
            onKeyDown={handleKeyDown}
            placeholder="بحث سريع في كل شيء... (عملاء، أصناف، مندوبين، فواتير)"
            className="w-full pr-10 pl-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border-0 focus:ring-2 focus:ring-secondary text-sm outline-none"
          />
          {open && query && (
            <div className="absolute top-full mt-2 w-full bg-surface border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl max-h-96 overflow-y-auto z-50">
              {results.length === 0 ? (
                <div className="p-4 text-center text-sm text-slate-400">لا توجد نتائج لـ "{query}"</div>
              ) : (
                results.map((r, i) => {
                  const Icon = typeIcon[r.type];
                  return (
                    <button
                      key={`${r.type}-${r.id}`}
                      type="button"
                      onMouseEnter={() => setActiveIndex(i)}
                      onClick={() => pick(r)}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 text-right text-sm ${i === activeIndex ? 'bg-secondary/10' : 'hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                    >
                      <Icon className="w-4 h-4 text-secondary shrink-0" />
                      <span className="flex-1 min-w-0">
                        <span className="block font-medium truncate">{r.label}</span>
                        <span className="block text-xs text-slate-400 truncate">{r.sub}</span>
                      </span>
                      <span className="text-[10px] text-slate-400 bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded-full shrink-0">{typeLabel[r.type]}</span>
                    </button>
                  );
                })
              )}
            </div>
          )}
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
