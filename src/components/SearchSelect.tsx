import { useEffect, useRef, useState } from 'react';

export type SearchOption = { id: string; label: string; sub?: string };

type Props = {
  value: string;
  display: string;
  options: SearchOption[];
  placeholder?: string;
  onPick: (id: string, label: string) => void;
  onQueryChange: (q: string) => void;
};

/**
 * قائمة بحث لا تُغلق قبل الاختيار (onMouseDown + preventDefault)
 */
export default function SearchSelect({ value, display, options, placeholder, onPick, onQueryChange }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(display || '');
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setQuery(display || '');
  }, [display]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const filtered = options.filter(o =>
    !query || o.label.includes(query) || (o.sub || '').includes(query)
  ).slice(0, 10);

  return (
    <div className="relative flex-1 min-w-[180px]" ref={wrapRef}>
      <input
        value={query}
        onChange={e => {
          setQuery(e.target.value);
          onQueryChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        placeholder={placeholder || 'ابحث...'}
        autoComplete="off"
        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-transparent text-sm outline-none focus:ring-2 focus:ring-secondary text-slate-900 dark:text-slate-100"
      />
      {open && filtered.length > 0 && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-slate-300 rounded-xl shadow-lg max-h-40 overflow-y-auto">
          {filtered.map(o => (
            <button
              key={o.id}
              type="button"
              onMouseDown={e => {
                e.preventDefault(); // يمنع blur قبل الاختيار
                onPick(o.id, o.label);
                setQuery(o.label);
                setOpen(false);
              }}
              className="w-full text-right px-3 py-2 hover:bg-slate-100 text-sm text-slate-900"
            >
              {o.label}{o.sub ? ` — ${o.sub}` : ''}
            </button>
          ))}
        </div>
      )}
      {value ? <p className="text-[10px] text-secondary mt-0.5">تم الاختيار</p> : null}
    </div>
  );
}
