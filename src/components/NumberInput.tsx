import { useEffect, useState } from 'react';

type Props = {
  value: number;
  onChange: (n: number) => void;
  placeholder?: string;
  min?: number;
  step?: number;
  className?: string;
};

/**
 * حقل رقمي يحفظ النص أثناء الكتابة ثم يحوّل لرقم — يمنع تجمد الإدخال في Electron
 */
export default function NumberInput({ value, onChange, placeholder, min, step, className }: Props) {
  const [text, setText] = useState(value === 0 ? '' : String(value));

  useEffect(() => {
    // مزامنة خارجية فقط إذا لم يكن المستخدم يكتب رقمًا جزئيًا
    const parsed = text === '' || text === '-' || text === '.' ? NaN : Number(text);
    if (!Number.isNaN(parsed) && parsed === value) return;
    if (document.activeElement?.getAttribute('data-num-input') === '1') return;
    setText(value === 0 ? '' : String(value));
  }, [value]);

  return (
    <input
      data-num-input="1"
      type="text"
      inputMode="decimal"
      value={text}
      placeholder={placeholder}
      className={className || 'px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-transparent text-sm outline-none focus:ring-2 focus:ring-secondary text-slate-900 dark:text-slate-100'}
      onChange={e => {
        const v = e.target.value;
        // السماح بأرقام ونقطة فقط
        if (v !== '' && !/^-?\d*\.?\d*$/.test(v)) return;
        setText(v);
        if (v === '' || v === '-' || v === '.') {
          onChange(0);
          return;
        }
        const n = Number(v);
        if (!Number.isNaN(n)) {
          if (min != null && n < min && v !== '') {
            // لا نمنع الكتابة، نمرر القيمة
          }
          onChange(n);
        }
      }}
      onBlur={() => {
        if (text === '' || text === '-' || text === '.') {
          setText(value === 0 ? '' : String(value));
        } else {
          const n = Number(text);
          if (!Number.isNaN(n)) {
            const final = min != null ? Math.max(min, n) : n;
            setText(String(final));
            onChange(final);
          }
        }
      }}
    />
  );
}
