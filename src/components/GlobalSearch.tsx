import { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { Search, Sparkles, User, Package, FileText, UserCheck } from 'lucide-react';
import { useApp } from '../store/AppContext';
import { normalizeArabic, matchIntent } from '../lib/aiEngine';

/**
 * شريط بحث حي حقيقي (كان سابقاً مجرد صندوق نصي بلا أي وظيفة) — يبحث فوراً
 * أثناء الكتابة في العملاء والأصناف والمندوبين وأرقام الفواتير، ويكتشف أيضاً
 * إن كانت الجملة المكتوبة سؤالاً طبيعياً (نفس محرك فهم المساعد الذكي)
 * ويعرض اقتراحاً مباشراً للانتقال إليه وتنفيذه هناك.
 *
 * نفس أسلوب العزل الكامل عبر Portal + أنماط inline المُستخدَم في SearchSelect
 * (أثبت نجاحه سابقاً في حل مشاكل التداخل البصري مع القوائم المنسدلة الأخرى).
 */

type ResultItem =
  | { kind: 'ai'; query: string }
  | { kind: 'customer'; id: string; label: string; sub: string }
  | { kind: 'product'; id: string; label: string; sub: string }
  | { kind: 'representative'; id: string; label: string; sub: string }
  | { kind: 'invoice'; id: string; label: string; sub: string };

const COLORS = {
  bg: '#ffffff', border: '#cbd5e1', text: '#0f172a', sub: '#64748b',
  activeBg: '#eef2f7', aiBg: '#f0fdf4', aiBorder: '#bbf7d0', aiText: '#059669'
};

export default function GlobalSearch() {
  const { data } = useApp();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [rect, setRect] = useState<{ top: number; left: number; width: number } | null>(null);

  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  useLayoutEffect(() => {
    if (!open) return;
    const update = () => {
      const el = wrapRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      setRect({ top: r.bottom + 6, left: r.left, width: r.width });
    };
    update();
    window.addEventListener('scroll', update, true);
    window.addEventListener('resize', update);
    return () => {
      window.removeEventListener('scroll', update, true);
      window.removeEventListener('resize', update);
    };
  }, [open]);

  const results: ResultItem[] = (() => {
    const q = query.trim();
    if (q.length < 2) return [];
    const nq = normalizeArabic(q);
    const items: ResultItem[] = [];

    // اكتشاف سؤال طبيعي — نعرضه أولاً دائماً إن وُجد
    const { intent } = matchIntent(q);
    if (intent !== 'unknown') {
      items.push({ kind: 'ai', query: q });
    }

    for (const c of data.customers) {
      if (normalizeArabic(c.name).includes(nq) || (c.phone && c.phone.includes(q))) {
        items.push({ kind: 'customer', id: c.id, label: c.name, sub: c.phone || 'عميل' });
        if (items.filter(i => i.kind === 'customer').length >= 4) break;
      }
    }
    for (const p of data.products) {
      if (normalizeArabic(p.name).includes(nq)) {
        items.push({ kind: 'product', id: p.id, label: p.name, sub: `مخزون: ${p.currentStock}` });
        if (items.filter(i => i.kind === 'product').length >= 4) break;
      }
    }
    for (const r of data.representatives) {
      if (normalizeArabic(r.name).includes(nq)) {
        items.push({ kind: 'representative', id: r.id, label: r.name, sub: 'مندوب' });
        if (items.filter(i => i.kind === 'representative').length >= 3) break;
      }
    }
    for (const inv of data.invoices) {
      if (String(inv.number).includes(q)) {
        items.push({ kind: 'invoice', id: inv.id, label: `فاتورة رقم ${inv.number}`, sub: inv.customerName });
        if (items.filter(i => i.kind === 'invoice').length >= 3) break;
      }
    }

    return items.slice(0, 12);
  })();

  useEffect(() => { setActiveIndex(-1); }, [query]);

  const goTo = (item: ResultItem) => {
    setOpen(false);
    setQuery('');
    if (item.kind === 'ai') {
      navigate('/ai-assistant', { state: { autoQuery: item.query } });
    } else if (item.kind === 'customer') {
      navigate(`/customers`);
    } else if (item.kind === 'product') {
      navigate(`/products`);
    } else if (item.kind === 'representative') {
      navigate(`/representatives`);
    } else if (item.kind === 'invoice') {
      navigate(`/invoices`);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open || results.length === 0) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIndex(i => Math.min(i + 1, results.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIndex(i => Math.max(i - 1, 0)); }
    else if (e.key === 'Enter') { e.preventDefault(); if (activeIndex >= 0) goTo(results[activeIndex]); else goTo(results[0]); }
    else if (e.key === 'Escape') { setOpen(false); }
  };

  const iconFor = (kind: ResultItem['kind']) => {
    if (kind === 'ai') return <Sparkles className="w-4 h-4" style={{ color: COLORS.aiText }} />;
    if (kind === 'customer') return <User className="w-4 h-4" style={{ color: COLORS.sub }} />;
    if (kind === 'product') return <Package className="w-4 h-4" style={{ color: COLORS.sub }} />;
    if (kind === 'representative') return <UserCheck className="w-4 h-4" style={{ color: COLORS.sub }} />;
    return <FileText className="w-4 h-4" style={{ color: COLORS.sub }} />;
  };

  const dropdown = open && rect && results.length > 0 ? createPortal(
    <div
      style={{
        position: 'fixed', top: rect.top, left: rect.left, width: rect.width,
        background: COLORS.bg, border: `1px solid ${COLORS.border}`, borderRadius: 14,
        boxShadow: '0 12px 32px rgba(15, 23, 42, 0.18)', maxHeight: 340, overflowY: 'auto',
        zIndex: 9999, direction: 'rtl', fontFamily: 'inherit'
      }}
    >
      {results.map((item, i) => (
        <div
          key={item.kind + i}
          onMouseEnter={() => setActiveIndex(i)}
          onMouseLeave={() => setActiveIndex(-1)}
          onMouseDown={e => { e.preventDefault(); goTo(item); }}
          style={{
            display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px',
            cursor: 'pointer', userSelect: 'none', textAlign: 'right',
            background: item.kind === 'ai' ? COLORS.aiBg : (i === activeIndex ? COLORS.activeBg : COLORS.bg),
            borderBottom: item.kind === 'ai' ? `1px solid ${COLORS.aiBorder}` : 'none'
          }}
        >
          {iconFor(item.kind)}
          <div style={{ flex: 1, minWidth: 0 }}>
            {item.kind === 'ai' ? (
              <>
                <div style={{ fontSize: 13, fontWeight: 700, color: COLORS.aiText }}>اسأل المساعد الذكي</div>
                <div style={{ fontSize: 12, color: COLORS.sub }}>"{item.query}"</div>
              </>
            ) : (
              <>
                <div style={{ fontSize: 13.5, color: COLORS.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.label}</div>
                <div style={{ fontSize: 11.5, color: COLORS.sub }}>{item.sub}</div>
              </>
            )}
          </div>
        </div>
      ))}
    </div>,
    document.body
  ) : null;

  return (
    <div className="relative w-full" ref={wrapRef}>
      <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={e => { setQuery(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onKeyDown={handleKeyDown}
        placeholder="بحث سريع في كل شيء... أو اسأل سؤالاً ذكياً"
        autoComplete="off"
        className="w-full pr-10 pl-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border-0 focus:ring-2 focus:ring-secondary text-sm outline-none"
      />
      {dropdown}
    </div>
  );
}
