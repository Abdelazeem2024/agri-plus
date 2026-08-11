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
  /** بطاقة ملخص مديونية/رصيد مميزة تُعرض أسفل الجدول — لكشوف الحساب */
  balanceSummary?: {
    label: string;          // مثال: "إجمالي المديونية على العميل"
    totalDebit: number;     // إجمالي ما أخذه/اشتراه (فواتير أو توريدات)
    totalCredit: number;    // إجمالي ما دفعه/حصّلناه منه
    totalReturns?: number;  // إجمالي المرتجعات إن وُجدت
    totalRefunds?: number;  // إجمالي المبالغ المستردة نقداً للعميل إن وُجدت
    remaining: number;      // الرصيد المتبقي (موجب = مديونية عليه)
    debitLabel?: string;    // تسمية مخصّصة لعمود "أخذ" (افتراضي: أخذ بضاعة)
    creditLabel?: string;   // تسمية مخصّصة لعمود "دفع/حصّلنا"
  };
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

/** يبني نص HTML الكامل للتقرير — يُستخدم من الطباعة المباشرة ومن التصدير لملف PDF معاً */
async function buildReportHtml(opts: PrintReportOptions, includeAutoPrintScript: boolean): Promise<string> {
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

  const bs = opts.balanceSummary;
  const balanceSummaryHtml = bs ? `
    <div class="balance-card">
      <div class="balance-title">${escapeHtml(bs.label)}</div>
      <div class="balance-grid">
        <div class="balance-item">
          <span class="balance-item-label">${escapeHtml(bs.debitLabel || 'إجمالي ما أخذ')}</span>
          <span class="balance-item-value debit">${escapeHtml(String(bs.totalDebit.toLocaleString('ar-EG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })))}</span>
        </div>
        <div class="balance-item">
          <span class="balance-item-label">${escapeHtml(bs.creditLabel || 'إجمالي ما دفع')}</span>
          <span class="balance-item-value credit">${escapeHtml(String(bs.totalCredit.toLocaleString('ar-EG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })))}</span>
        </div>
        ${bs.totalReturns ? `
        <div class="balance-item">
          <span class="balance-item-label">إجمالي المرتجعات</span>
          <span class="balance-item-value returns">${escapeHtml(String(bs.totalReturns.toLocaleString('ar-EG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })))}</span>
        </div>` : ''}
        ${bs.totalRefunds ? `
        <div class="balance-item">
          <span class="balance-item-label">مسترد نقداً للعميل</span>
          <span class="balance-item-value refund">${escapeHtml(String(bs.totalRefunds.toLocaleString('ar-EG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })))}</span>
        </div>` : ''}
        <div class="balance-item remaining">
          <span class="balance-item-label">المتبقي (الرصيد الحالي)</span>
          <span class="balance-item-value">${escapeHtml(String(bs.remaining.toLocaleString('ar-EG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })))}</span>
        </div>
      </div>
    </div>` : '';

  return `<!DOCTYPE html>
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

  /* بطاقة ملخص الرصيد/المديونية — إبراز واضح واحترافي أسفل الجدول */
  .balance-card {
    margin-top: 22px;
    border-radius: 16px;
    overflow: hidden;
    border: 1px solid var(--line);
    box-shadow: 0 4px 14px rgba(15, 23, 42, 0.06);
  }
  .balance-title {
    background: linear-gradient(135deg, var(--brand), var(--brand-dark));
    color: #fff;
    font-weight: 700;
    font-size: 13.5px;
    padding: 10px 18px;
  }
  .balance-grid {
    display: flex;
    flex-wrap: wrap;
  }
  .balance-item {
    flex: 1 1 0;
    min-width: 120px;
    padding: 14px 16px;
    text-align: center;
    border-left: 1px solid var(--line);
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .balance-item:last-child { border-left: none; }
  .balance-item-label { font-size: 10.5px; color: var(--muted); font-weight: 600; }
  .balance-item-value { font-size: 16px; font-weight: 800; font-variant-numeric: tabular-nums; }
  .balance-item-value.debit { color: #dc2626; }
  .balance-item-value.credit { color: #059669; }
  .balance-item-value.returns { color: #d97706; }
  .balance-item-value.refund { color: #7c3aed; }
  .balance-item.remaining { background: #ecfdf5; }
  .balance-item.remaining .balance-item-value { color: var(--brand-dark); font-size: 19px; }

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
    .title-band, thead th, tbody tr.totals, .balance-title, .balance-item.remaining { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
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

    ${balanceSummaryHtml}

    <div class="footer">
      <div>${escapeHtml(opts.footerNote || `تم إنشاء هذا التقرير في ${generatedAt}`)}</div>
      <div class="brand"><bdi>Agri Plus</bdi> — نظام محاسبة المبيدات الزراعية</div>
    </div>
  </div>
  ${includeAutoPrintScript ? `<script>
    window.onload = function () {
      setTimeout(function () { window.print(); }, 300);
    };
    window.onafterprint = function () { window.close(); };
  </script>` : ''}
</body>
</html>`;
}

/** طباعة تقرير عربي احترافي — يفتح نافذة طباعة منسّقة بالكامل */
export async function printRtlReport(opts: PrintReportOptions): Promise<void> {
  const html = await buildReportHtml(opts, true);
  const w = window.open('', '_blank');
  if (!w) {
    alert('اسمح بالنوافذ المنبثقة لتصدير التقرير');
    return;
  }
  w.document.open();
  w.document.write(html);
  w.document.close();
}

/**
 * تصدير التقرير كملف PDF حقيقي على القرص، مع مربع حوار "اختر مكان الحفظ" الأصلي
 * لنظام التشغيل — عبر Electron (webContents.printToPDF)، منفصل تماماً عن زر الطباعة.
 */
export async function exportReportPdf(opts: PrintReportOptions, suggestedFileName?: string): Promise<{ success: boolean; canceled?: boolean; path?: string; message?: string }> {
  const html = await buildReportHtml(opts, false);
  const api = (window as any).electronAPI;
  if (!api?.exportHtmlToPdf) {
    // بديل احتياطي خارج Electron: افتح نافذة طباعة عادية يختار منها المستخدم "حفظ كـ PDF"
    await printRtlReport(opts);
    return { success: true, message: 'تم فتح نافذة الطباعة — اختر "حفظ كـ PDF" من خيارات الطابعة' };
  }
  const fileName = suggestedFileName || `${opts.title.replace(/[\\/:*?"<>|]/g, '-')}.pdf`;
  return api.exportHtmlToPdf(html, fileName);
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
