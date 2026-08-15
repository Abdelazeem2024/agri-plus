import { useEffect, useRef, useState, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';

export type SearchOption = { id: string; label: string; sub?: string };

type Props = {
  value: string;
  display: string;
  options: SearchOption[];
  placeholder?: string;
  onPick: (id: string, label: string) => void;
  onQueryChange: (q: string) => void;
  maxResults?: number;
};

/**
 * قائمة اختيار مخصصة بالكامل — معزولة تماماً عن أي CSS خارجي في البرنامج.
 *
 * لماذا أُعيد بناؤها بهذا الشكل تحديداً (بعد عدة محاولات سابقة فشلت):
 * 1) القائمة تُرسَم عبر React Portal مباشرة إلى document.body — خارج أي حاوية
 *    أب قد تحمل filter/opacity/overflow/transform يمكن أن يُحدث سلوكاً بصرياً
 *    غريباً لا علاقة له بألوان العنصر نفسه.
 * 2) كل لون هنا "inline style" مباشر (style={{...}}) وليس Tailwind class —
 *    الأنماط المضمَّنة (inline) لها أعلى أولوية ممكنة في CSS تقريباً (تُهزَم فقط
 *    بقاعدة !important، ولا توجد أي قاعدة !important في هذا التطبيق تستهدف هذا
 *    المكوّن تحديداً). هذا يقطع الطريق نهائياً على أي تضارب مع أي ملف تنسيق آخر.
 * 3) عناصر القائمة div[role="option"] وليست <button> — لتفادي أي تصفير/تنسيق
 *    عام قد يُطبَّق على عنصر button في مكان آخر بالتطبيق.
 * 4) التلوين مبني بالكامل على حالة React (activeIndex) عبر onMouseEnter/Leave،
 *    وليس على :hover في CSS — بحيث الفأرة ولوحة المفاتيح تسلكان نفس المسار
 *    البرمجي الواحد الموثوق، بدل الاعتماد على سلوك المتصفح الافتراضي للعنصر.
 * 5) لا تمييز افتراضي للعنصر الأول: activeIndex يبدأ بـ -1، فلا يظهر أي عنصر
 *    "مضيئاً" تلقائياً بمجرد ظهور نتيجة واحدة فقط — المستخدم يجب أن يمرّر
 *    الفأرة أو يستخدم الأسهم صراحة ليظهر أي تمييز.
 */

const COLORS = {
  border: '#cbd5e1',
  bg: '#ffffff',
  text: '#0f172a',
  sub: '#64748b',
  activeBg: '#eef2f7',
  emptyText: '#94a3b8',
  inputBorder: '#cbd5e1',
  inputBorderFocus: '#059669'
};

export default function SearchSelect({ value, display, options, placeholder, onPick, onQueryChange, maxResults = 20 }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(display || '');
  const [activeIndex, setActiveIndex] = useState(-1);
  const [focused, setFocused] = useState(false);
  const [rect, setRect] = useState<{ top: number; left: number; width: number } | null>(null);

  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setQuery(display || ''); }, [display]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  // نحسب موضع الحقل على الشاشة حتى نضع القائمة (المرسَلة عبر Portal لجذر
  // المستند) في المكان الصحيح تماماً أسفله، ونحدّثه عند فتح القائمة والتمرير وتغيير حجم النافذة
  useLayoutEffect(() => {
    if (!open) return;
    const update = () => {
      const el = wrapRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      setRect({ top: r.bottom + 4, left: r.left, width: r.width });
    };
    update();
    window.addEventListener('scroll', update, true);
    window.addEventListener('resize', update);
    return () => {
      window.removeEventListener('scroll', update, true);
      window.removeEventListener('resize', update);
    };
  }, [open]);

  const filtered = options.filter(o =>
    !query || o.label.includes(query) || (o.sub || '').includes(query)
  ).slice(0, maxResults);

  useEffect(() => { setActiveIndex(-1); }, [query, open]);

  const pick = (o: SearchOption) => {
    onPick(o.id, o.label);
    setQuery(o.label);
    setOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') { setOpen(true); }
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
      if (activeIndex >= 0 && filtered[activeIndex]) pick(filtered[activeIndex]);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  const dropdown = open && rect ? createPortal(
    <div
      style={{
        position: 'fixed',
        top: rect.top,
        left: rect.left,
        width: rect.width,
        background: COLORS.bg,
        border: `1px solid ${COLORS.border}`,
        borderRadius: 12,
        boxShadow: '0 10px 30px rgba(15, 23, 42, 0.25)',
        maxHeight: 220,
        overflowY: 'auto',
        zIndex: 9999,
        direction: 'rtl',
        fontFamily: 'inherit'
      }}
    >
      {filtered.length === 0 ? (
        <div style={{ padding: '10px 14px', fontSize: 13, color: COLORS.emptyText }}>
          {query ? 'لا توجد نتائج' : 'لا توجد عناصر'}
        </div>
      ) : filtered.map((o, i) => (
        <div
          key={o.id}
          role="option"
          aria-selected={i === activeIndex}
          onMouseEnter={() => setActiveIndex(i)}
          onMouseLeave={() => setActiveIndex(-1)}
          onMouseDown={e => { e.preventDefault(); pick(o); }}
          style={{
            padding: '9px 14px',
            fontSize: 13.5,
            color: COLORS.text,
            background: i === activeIndex ? COLORS.activeBg : COLORS.bg,
            cursor: 'pointer',
            userSelect: 'none',
            textAlign: 'right'
          }}
        >
          {o.label}{o.sub ? ` — ${o.sub}` : ''}
        </div>
      ))}
    </div>,
    document.body
  ) : null;

  return (
    <div className="relative flex-1 min-w-[180px]" ref={wrapRef}>
      <input
        ref={inputRef}
        value={query}
        onChange={e => {
          setQuery(e.target.value);
          onQueryChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => { setOpen(true); setFocused(true); }}
        onBlur={() => setFocused(false)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder || 'ابحث...'}
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
        role="combobox"
        aria-expanded={open}
        aria-autocomplete="list"
        style={{
          width: '100%',
          padding: '9px 12px',
          borderRadius: 12,
          border: `1px solid ${focused ? COLORS.inputBorderFocus : COLORS.inputBorder}`,
          background: 'transparent',
          fontSize: 14,
          outline: 'none'
        }}
        className="text-slate-900 dark:text-slate-100"
      />
      {dropdown}
      {value ? <p className="text-[10px] text-secondary mt-0.5">تم الاختيار</p> : null}
    </div>
  );
}
