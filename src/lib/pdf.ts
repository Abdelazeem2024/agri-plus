/**
 * محرك طباعة/تصدير التقارير — Agri Plus
 * تصميم احترافي موحّد لكل التقارير وكشوف الحساب: خط عربي مضمّن (Base64) حتى
 * يظهر بشكل صحيح دائماً بغض النظر عن الخطوط المثبتة على جهاز العميل،
 * ترويسة بشعار الشركة واسمها وهاتفها وعنوانها، جدول أنيق، وتذييل احترافي.
 */
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import arabicFontUrl from '../assets/fonts/NotoNaskhArabic-Regular.ttf';

export function rtl(text: string | number | null | undefined): string {
  if (text == null) return '';
  return String(text);
}

export interface PrintReportOptions {
  title: string;
  companyName?: string;
  companyPhone?: string;
  companyAddress?: string;
  companyLogo?: string; // Data URL (base64) للشعار
  subtitle?: string;
  headers: string[];
  rows: (string | number)[][];
  footerNote?: string;
  /** أعمدة رقمية (يمين المحاذاة الرقمية تبقى كما هي، لكن تُستخدم لتمييز عمود الإجمالي بصرياً) */
  totalsRowIndex?: number; // إن أردت تمييز صف معيّن (مثل الإجمالي) بخط عريض وخلفية مختلفة
}

// ── تضمين الخط العربي كـ Base64 مرة واحدة وتخزينه مؤقتاً ──
let cachedFontBase64: string | null | undefined;

async function getArabicFontBase64(): Promise<string | null> {
  if (cachedFontBase64 !== undefined) return cachedFontBase64;
  try {
    const res = await fetch(arabicFontUrl);
    const buf = await res.arrayBuffer();
    const bytes = new Uint8Array(buf);
    let binary = '';
    const chunkSize = 0x8000;
    for (let i = 0; i < bytes.length; i += chunkSize) {
      binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
    }
    cachedFontBase64 = btoa(binary);
  } catch {
    cachedFontBase64 = null; // فشل التحميل — سيُستخدم خط النظام كبديل
  }
  return cachedFontBase64;
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** يحاول تمييز القيم الرقمية (مبالغ) لعرضها بخط أرقام واضح LTR داخل خلية RTL */
function isNumericCell(v: string | number): boolean {
  if (typeof v === 'number') return true;
  const s = v.trim();
  if (!s) return false;
  return /^-?[\d,]+(\.\d+)?\s*(ج\.م|ر\.س|د\.إ|\$)?$/.test(s);
}

/** طباعة / تصدير تقرير عربي احترافي — يفتح نافذة طباعة منسّقة بالكامل */
export async function printRtlReport(opts: PrintReportOptions): Promise<void> {
  const company = opts.companyName || '';
  const phone = opts.companyPhone || '';
  const address = opts.companyAddress || '';
  const logo = opts.companyLogo || '';
  const subtitle = opts.subtitle || '';
  const generatedAt = new Date().toLocaleString('ar-EG', {
    year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
  });

  const fontBase64 = await getArabicFontBase64();
  const fontFace = fontBase64
    ? `@font-face {
        font-family: 'ArabicReport';
        src: url(data:font/truetype;charset=utf-8;base64,${fontBase64}) format('truetype');
        font-weight: normal;
        font-style: normal;
        font-display: block;
      }`
    : '';

  const thead = opts.headers.map(h => `<th>${escapeHtml(String(h))}</th>`).join('');
  const tbody = opts.rows.length
    ? opts.rows.map((r, ri) => {
        const isTotals = opts.totalsRowIndex != null && ri === opts.totalsRowIndex;
        const cells = r.map(c => {
          const val = c ?? '';
          const numCls = isNumericCell(val) ? ' class="num"' : '';
          return `<td${numCls}>${escapeHtml(String(val))}</td>`;
        }).join('');
        return `<tr${isTotals ? ' class="totals"' : ''}>${cells}</tr>`;
      }).join('')
    : `<tr><td colspan="99" class="empty">لا توجد بيانات لعرضها</td></tr>`;

  const html = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="utf-8" />
<title>${escapeHtml(opts.title)} — Agri Plus</title>
<style>
  ${fontFace}
  :root {
    --brand: #059669;
    --brand-dark: #047857;
    --ink: #0f172a;
    --muted: #64748b;
    --line: #e2e8f0;
    --zebra: #f8fafc;
  }
  * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  html, body { margin: 0; padding: 0; }
  body {
    font-family: 'ArabicReport', 'Segoe UI', Tahoma, Arial, sans-serif;
    direction: rtl;
    color: var(--ink);
    background: #ffffff;
    padding: 22px 26px 30px;
    font-size: 13px;
    line-height: 1.6;
    position: relative;
  }

  .sheet { position: relative; z-index: 1; }

  /* علامة مائية خفيفة جداً باسم الشركة — محصورة داخل منطقة الجدول فقط
     حتى لا تتداخل مع رأس/تذييل الصفحة، ولمسة احترافية بدون التأثير على وضوح القراءة */
  .watermark {
    position: absolute;
    top: 130px;
    bottom: 60px;
    left: 0;
    right: 0;
    overflow: hidden;
    display: flex;
    align-items: center;
    justify-content: center;
    pointer-events: none;
    z-index: 0;
    opacity: 0.028;
    transform: rotate(-24deg);
    font-size: 42px;
    font-weight: 700;
    color: var(--brand-dark);
    white-space: nowrap;
  }

  .header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    border-bottom: 3px solid var(--brand);
    padding-bottom: 14px;
    margin-bottom: 6px;
  }
  .header .id-block { display: flex; align-items: center; gap: 12px; }
  .header img.logo {
    width: 56px; height: 56px; object-fit: contain;
    border-radius: 12px; background: #f1f5f9; padding: 4px;
  }
  .header .company-name { font-size: 19px; font-weight: 700; color: var(--ink); margin: 0; }
  .header .company-meta { font-size: 11.5px; color: var(--muted); margin-top: 3px; display: flex; gap: 10px; flex-wrap: wrap; }
  .header .company-meta span { display: inline-flex; align-items: center; gap: 4px; }
  .header .brand-badge {
    font-size: 10.5px; font-weight: 700; color: #fff;
    background: linear-gradient(135deg, var(--brand), var(--brand-dark));
    padding: 5px 12px; border-radius: 999px; white-space: nowrap;
  }

  .title-band {
    background: linear-gradient(135deg, var(--brand), var(--brand-dark));
    color: #fff;
    border-radius: 14px;
    padding: 14px 20px;
    margin: 16px 0 18px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 8px;
  }
  .title-band h1 { margin: 0; font-size: 17px; font-weight: 700; }
  .title-band .subtitle { font-size: 12px; opacity: 0.92; }

  table { width: 100%; border-collapse: collapse; margin-top: 4px; }
  thead th {
    background: var(--brand);
    color: #fff;
    font-weight: 700;
    font-size: 12.5px;
    padding: 10px 12px;
    text-align: right;
    border: 1px solid var(--brand-dark);
    white-space: nowrap;
  }
  tbody td {
    border: 1px solid var(--line);
    padding: 9px 12px;
    text-align: right;
    font-size: 12.5px;
    vertical-align: top;
  }
  tbody td.num { font-variant-numeric: tabular-nums; }
  tbody tr:nth-child(even) { background: var(--zebra); }
  tbody tr:hover { background: #f0fdf4; }
  tbody tr.totals { background: #ecfdf5 !important; font-weight: 700; }
  tbody tr.totals td { border-top: 2px solid var(--brand); }
  td.empty { text-align: center; padding: 28px; color: var(--muted); }

  .footer {
    margin-top: 22px;
    padding-top: 12px;
    border-top: 1px solid var(--line);
    font-size: 10.5px;
    color: var(--muted);
    text-align: center;
  }
  .footer div + div { margin-top: 4px; }
  .footer .brand { font-weight: 700; color: var(--brand-dark); }

  @page { size: A4; margin: 12mm; }
  @media print {
    body { padding: 0; }
    .no-print { display: none; }
    .title-band, thead th, tbody tr.totals { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    thead { display: table-header-group; }
    tr { page-break-inside: avoid; }
  }
</style>
</head>
<body>
  <div class="sheet">
    <div class="watermark">${escapeHtml(company || 'Agri Plus')}</div>
    <div class="header">
      <div class="id-block">
        ${logo ? `<img class="logo" src="${logo}" alt="logo" />` : ''}
        <div>
          ${company ? `<p class="company-name">${escapeHtml(company)}</p>` : ''}
          <div class="company-meta">
            ${phone ? `<span>📞 ${escapeHtml(phone)}</span>` : ''}
            ${address ? `<span>📍 ${escapeHtml(address)}</span>` : ''}
          </div>
        </div>
      </div>
      <span class="brand-badge"><bdi>Agri Plus</bdi></span>
    </div>

    <div class="title-band">
      <h1>${escapeHtml(opts.title)}</h1>
      <span class="subtitle">${escapeHtml(subtitle || generatedAt)}</span>
    </div>

    <table>
      <thead><tr>${thead}</tr></thead>
      <tbody>${tbody}</tbody>
    </table>

    <div class="footer">
      <div>${escapeHtml(opts.footerNote || `تم إنشاء هذا التقرير في ${generatedAt}`)}</div>
      <div class="brand"><bdi>Agri Plus</bdi> — نظام محاسبة المبيدات الزراعية</div>
    </div>
  </div>
  <script>
    window.onload = function () {
      setTimeout(function () { window.print(); }, 300);
    };
    window.onafterprint = function () { window.close(); };
  </script>
</body>
</html>`;

  const w = window.open('', '_blank');
  if (!w) {
    alert('اسمح بالنوافذ المنبثقة لتصدير التقرير');
    return;
  }
  w.document.open();
  w.document.write(html);
  w.document.close();
}

/** توافق مع الاستدعاءات القديمة (jsPDF مباشر) — غير مستخدم في التقارير الحالية */
export async function createArabicPdf(_orientation: 'portrait' | 'landscape' = 'portrait') {
  const doc = new jsPDF({ orientation: _orientation, unit: 'mm', format: 'a4' });
  return { doc, hasFont: false };
}

export function addPdfHeader(doc: jsPDF, title: string, companyName?: string, y = 14) {
  doc.setFontSize(14);
  doc.text(String(companyName || ''), doc.internal.pageSize.getWidth() / 2, y, { align: 'center' });
  doc.setFontSize(12);
  doc.text(String(title), doc.internal.pageSize.getWidth() / 2, y + 8, { align: 'center' });
  return y + 16;
}

export function addPdfTable(
  doc: jsPDF,
  head: string[][],
  body: (string | number)[][],
  startY: number,
  _ltrColumns?: number[]
) {
  autoTable(doc, {
    head,
    body: body.map(r => r.map(c => String(c ?? ''))),
    startY,
    styles: { fontSize: 9, halign: 'right', cellPadding: 2 },
    headStyles: { fillColor: [5, 150, 105], textColor: 255, halign: 'right' },
    margin: { left: 10, right: 10 }
  });
}

export interface ExportPdfOptions {
  title: string;
  companyName?: string;
  companyPhone?: string;
  companyAddress?: string;
  companyLogo?: string;
  subtitle?: string;
  head: string[];
  body: (string | number)[][];
  filename?: string;
  orientation?: 'portrait' | 'landscape';
  ltrColumns?: number[];
}

export async function exportPdf(opts: ExportPdfOptions) {
  await printRtlReport({
    title: opts.title,
    companyName: opts.companyName,
    companyPhone: opts.companyPhone,
    companyAddress: opts.companyAddress,
    companyLogo: opts.companyLogo,
    subtitle: opts.subtitle,
    headers: opts.head,
    rows: opts.body,
    footerNote: opts.filename || undefined
  });
}

export interface ExportArabicTablePdfOptions {
  title: string;
  headers: string[];
  rows: (string | number)[][];
  fileName?: string;
  companyName?: string;
  companyPhone?: string;
  companyAddress?: string;
  companyLogo?: string;
  subtitle?: string;
  orientation?: 'portrait' | 'landscape';
  ltrColumns?: number[];
}

export async function exportArabicTablePdf(opts: ExportArabicTablePdfOptions) {
  await printRtlReport({
    title: opts.title,
    companyName: opts.companyName,
    companyPhone: opts.companyPhone,
    companyAddress: opts.companyAddress,
    companyLogo: opts.companyLogo,
    subtitle: opts.subtitle,
    headers: opts.headers,
    rows: opts.rows,
    footerNote: opts.fileName
  });
}
