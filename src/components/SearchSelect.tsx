import { useEffect, useRef, useState } from 'react';

export type SearchOption = { id: string; label: string; sub?: string };

type Props = {
  value: string;
  display: string;
  options: SearchOption[];
  placeholder?: string;
  onPick: (id: string, label: string) => void;
  onQueryChange: (q: string) => void;
  /** أقصى عدد نتائج تُعرض دفعة واحدة (افتراضي 20) */
  maxResults?: number;
};

/**
 * قائمة اختيار مخصصة بالكامل (بحث + قائمة) — بديل موحّد عن عنصر <select> الأصلي
 * في كل أنحاء البرنامج. السبب: القائمة المنسدلة لعنصر <select> الأصلي تُرسَم
 * بواسطة نظام التشغيل/Chromium مباشرة (native popup)، ولا يمكن التحكم الكامل
 * بألوانها عبر CSS مهما فعلنا — تحديداً في الوضع الليلي. هذا المكوّن مبني بالكامل
 * من عناصر HTML عادية (div/button) نتحكم نحن في كل بكسل منها، فلا يوجد أي جزء
 * "أصلي" من المتصفح يمكن أن يفرض لوناً غير متوقع.
 *
 * يدعم: فتح/إغلاق، تمرير الماوس، اختيار، تصفية بالكتابة، التنقل بالأسهم ↑↓،
 * Enter للاختيار، Esc للإغلاق — لتغطية نفس تجربة الاستخدام الكاملة لعنصر select
 * الأصلي وأكثر.
 */
export default function SearchSelect({ value, display, options, placeholder, onPick, onQueryChange, maxResults = 20 }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(display || '');
  const [activeIndex, setActiveIndex] = useState(0);
  const wrapRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

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
  ).slice(0, maxResults);

  useEffect(() => { setActiveIndex(0); }, [query, open]);

  const pick = (o: SearchOption) => {
    onPick(o.id, o.label);
    setQuery(o.label);
    setOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') { setOpen(true); return; }
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex(i => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex(i => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filtered[activeIndex]) pick(filtered[activeIndex]);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

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
        onKeyDown={handleKeyDown}
        placeholder={placeholder || 'ابحث...'}
        autoComplete="off"
        role="combobox"
        aria-expanded={open}
        aria-autocomplete="list"
        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-transparent text-sm outline-none focus:ring-2 focus:ring-secondary text-slate-900 dark:text-slate-100"
      />
      {open && filtered.length > 0 && (
        <div ref={listRef} className="absolute z-50 mt-1 w-full bg-white border border-slate-300 rounded-xl shadow-lg max-h-52 overflow-y-auto">
          {filtered.map((o, i) => (
            <button
              key={o.id}
              type="button"
              onMouseEnter={() => setActiveIndex(i)}
              onMouseDown={e => {
                e.preventDefault(); // يمنع blur قبل الاختيار
                pick(o);
              }}
              className={`w-full text-right px-3 py-2 text-sm text-slate-900 ${i === activeIndex ? 'bg-slate-100' : 'bg-white'}`}
            >
              {o.label}{o.sub ? ` — ${o.sub}` : ''}
            </button>
          ))}
        </div>
      )}
      {open && query && filtered.length === 0 && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-slate-300 rounded-xl shadow-lg px-3 py-2 text-sm text-slate-400">
          لا توجد نتائج
        </div>
      )}
      {value ? <p className="text-[10px] text-secondary mt-0.5">تم الاختيار</p> : null}
    </div>
  );
}
