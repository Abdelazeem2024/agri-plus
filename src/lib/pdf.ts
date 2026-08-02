/**
 * Arabic PDF export — commercial print quality helpers
 * - Embedded Noto Naskh Arabic
 * - Segment-based BiDi for mixed Arabic / numbers / Latin
 * - RTL table alignment + page footer
 */
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

let fontBase64Cache: string | null = null;

async function loadArabicFontBase64(): Promise<string | null> {
  if (fontBase64Cache) return fontBase64Cache;
  const paths = ['./fonts/NotoNaskhArabic-Regular.ttf', '/fonts/NotoNaskhArabic-Regular.ttf'];
  for (const path of paths) {
    try {
      const res = await fetch(path);
      if (!res.ok) continue;
      const buf = await res.arrayBuffer();
      fontBase64Cache = arrayBufferToBase64(buf);
      return fontBase64Cache;
    } catch {
      /* try next */
    }
  }
  return null;
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk) as unknown as number[]);
  }
  return btoa(binary);
}

const ARABIC_RE = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;
const NEUTRAL_RE = /[\s\u00A0.,:;!?()[\]{}«»"'\-\/\\|@#%&*=+<>]/;
const NUMBER_RE = /[0-9\u0660-\u0669\u06F0-\u06F9.,]/;
const LATIN_RE = /[A-Za-z]/;

type SegKind = 'ar' | 'en' | 'num' | 'neutral';

function classifyChar(ch: string): SegKind {
  if (ARABIC_RE.test(ch)) return 'ar';
  if (NUMBER_RE.test(ch) && !LATIN_RE.test(ch)) return 'num';
  if (LATIN_RE.test(ch)) return 'en';
  return 'neutral';
}

/**
 * Visual order for RTL paragraph in jsPDF (no full Unicode BiDi engine).
 * - Arabic runs: reversed character order (glyph order for unshaped font is acceptable with Noto)
 * - Numbers & Latin runs: kept LTR
 * - Segment order: reversed for RTL base direction
 */
export function rtl(text: string | number | null | undefined): string {
  if (text == null) return '';
  const s = String(text);
  if (!s) return '';
  if (!ARABIC_RE.test(s)) return s; // pure LTR (numbers, latin) — no change

  // Tokenize into runs
  const runs: { kind: SegKind; text: string }[] = [];
  let curKind = classifyChar(s[0]);
  let buf = s[0];

  for (let i = 1; i < s.length; i++) {
    const ch = s[i];
    let kind = classifyChar(ch);
    // Attach neutrals to current run to avoid over-splitting
    if (kind === 'neutral') {
      buf += ch;
      continue;
    }
    // Numbers adjacent to arabic often stay with surrounding context
    if (kind === curKind || (curKind === 'num' && kind === 'en') || (curKind === 'en' && kind === 'num')) {
      if (curKind === 'num' && kind === 'en') curKind = 'en';
      if (curKind === 'en' && kind === 'num') {
        /* keep en run, append digits */
      }
      buf += ch;
      continue;
    }
    runs.push({ kind: curKind, text: buf });
    curKind = kind;
    buf = ch;
  }
  runs.push({ kind: curKind, text: buf });

  // Process each run
  const visualRuns = runs.map(run => {
    if (run.kind === 'ar') {
      // Reverse Arabic characters for visual RTL with non-shaping path
      return reversePreservingCombining(run.text);
    }
    // en / num / neutral: keep as-is (LTR)
    return run.text;
  });

  // RTL base: reverse run order
  return visualRuns.reverse().join('');
}

function reversePreservingCombining(text: string): string {
  // Simple reverse is OK for Noto Naskh in jsPDF for most commercial labels
  return text.split('').reverse().join('');
}

/** Format number for PDF cells (Latin digits, stable) */
export function pdfNumber(n: number | string | null | undefined, digits = 2): string {
  if (n == null || n === '') return '';
  const num = typeof n === 'number' ? n : Number(n);
  if (Number.isNaN(num)) return String(n);
  return num.toLocaleString('en-US', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits
  });
}

export async function createArabicPdf(orientation: 'portrait' | 'landscape' = 'landscape') {
  const doc = new jsPDF({ orientation, unit: 'mm', format: 'a4' });
  const b64 = await loadArabicFontBase64();
  let fontLoaded = false;
  if (b64) {
    doc.addFileToVFS('NotoNaskhArabic-Regular.ttf', b64);
    doc.addFont('NotoNaskhArabic-Regular.ttf', 'NotoNaskhArabic', 'normal');
    doc.setFont('NotoNaskhArabic');
    fontLoaded = true;
  }
  return { doc, fontLoaded };
}

export type PdfTableOptions = {
  title: string;
  subtitle?: string;
  headers: string[];
  rows: (string | number)[][];
  fileName: string;
  orientation?: 'portrait' | 'landscape';
  companyName?: string;
  /** Column indexes that should stay LTR (numbers) — 0-based */
  ltrColumns?: number[];
};

export async function exportArabicTablePdf(opts: PdfTableOptions) {
  const { doc, fontLoaded: hasFont } = await createArabicPdf(opts.orientation || 'landscape');
  const font = hasFont ? 'NotoNaskhArabic' : 'helvetica';
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const ltrCols = new Set(opts.ltrColumns || []);

  // Header band
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, pageW, 28, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont(font, 'normal');
  doc.setFontSize(15);
  doc.text(rtl(opts.title), pageW - 12, 12, { align: 'right' });
  doc.setFontSize(9);
  if (opts.companyName) {
    doc.text(rtl(opts.companyName), pageW - 12, 19, { align: 'right' });
  }
  doc.setTextColor(200, 200, 200);
  const sub = opts.subtitle || new Date().toLocaleString('ar-EG');
  doc.text(rtl(sub), pageW - 12, 25, { align: 'right' });
  doc.setTextColor(0, 0, 0);

  const processCell = (cell: string | number, colIndex: number) => {
    if (ltrCols.has(colIndex)) {
      // Force LTR number/code display
      return String(cell ?? '');
    }
    return rtl(cell);
  };

  const head = [opts.headers.map((h, i) => processCell(h, i))];
  const body = opts.rows.map(row => row.map((cell, i) => processCell(cell, i)));

  autoTable(doc, {
    startY: 34,
    head,
    body,
    styles: {
      font,
      fontSize: 8,
      halign: 'right',
      valign: 'middle',
      cellPadding: { top: 2.5, bottom: 2.5, left: 2, right: 2 },
      overflow: 'linebreak',
      lineColor: [226, 232, 240],
      lineWidth: 0.2
    },
    headStyles: {
      font,
      fillColor: [5, 150, 105],
      textColor: 255,
      halign: 'right',
      fontStyle: 'normal',
      cellPadding: { top: 3, bottom: 3, left: 2, right: 2 }
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252]
    },
    margin: { left: 10, right: 10, bottom: 16 },
    didParseCell: (data) => {
      // Numeric columns: center-right, monospace-like feel
      if (ltrCols.has(data.column.index) && data.section === 'body') {
        data.cell.styles.halign = 'right';
      }
    }
  });

  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setDrawColor(226, 232, 240);
    doc.line(10, pageH - 12, pageW - 10, pageH - 12);
    doc.setFont(font, 'normal');
    doc.setFontSize(8);
    doc.setTextColor(120);
    doc.text(rtl('Agri Plus'), 12, pageH - 7, { align: 'left' });
    doc.text(`${i} / ${pageCount}`, pageW / 2, pageH - 7, { align: 'center' });
    doc.text(rtl('مستند محاسبي'), pageW - 12, pageH - 7, { align: 'right' });
  }

  doc.save(opts.fileName);
}
