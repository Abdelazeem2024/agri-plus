/**
 * تصدير تقارير عربية واضحة عبر نافذة طباعة HTML (أفضل جودة للعربية)
 * + دعم jsPDF احتياطي
 */
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

import { isCapacitorNative } from '../db/capacitorDb';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

export function rtl(text: string | number | null | undefined): string {
  if (text == null) return '';
  return String(text);
}

export interface PrintReportOptions {
  title: string;
  companyName?: string;
  companyPhone?: string;
  /** شعار المحل بصيغة Base64 (data URL كاملة، مثال: "data:image/png;base64,...") — اختياري */
  companyLogo?: string;
  subtitle?: string;
  headers: string[];
  rows: (string | number)[][];
  footerNote?: string;
}

/** يبني نص HTML الكامل للتقرير — مستخرَج كدالة مستقلة لإعادة استخدامه في
 * مسار الطباعة (سطح المكتب) ومسار المشاركة (الهاتف) بنفس التصميم بالضبط */
function buildReportHtml(opts: PrintReportOptions, autoPrint: boolean): string {
  const company = opts.companyName || '';
  const phone = opts.companyPhone || opts.subtitle || '';
  const thead = opts.headers.map(h => `<th>${escapeHtml(String(h))}</th>`).join('');
  const tbody = opts.rows.map(r =>
    `<tr>${r.map(c => `<td>${escapeHtml(String(c ?? ''))}</td>`).join('')}</tr>`
  ).join('');

  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="utf-8" />
<title>${escapeHtml(opts.title)}</title>
<style>
  @page { margin: 15mm; }
  * { box-sizing: border-box; }
  body {
    font-family: "Segoe UI", Tahoma, "Noto Naskh Arabic", Arial, sans-serif;
    direction: rtl;
    color: #0f172a;
    margin: 0;
    padding: 16px;
    font-size: 13px;
  }
  .header { text-align: center; margin-bottom: 18px; border-bottom: 2px solid #059669; padding-bottom: 12px; }
  .header .logo { max-width: 90px; max-height: 90px; margin: 0 auto 8px; display: block; object-fit: contain; }
  .header h1 { margin: 0 0 4px; font-size: 20px; color: #0f172a; }
  .header .phone { color: #334155; font-size: 13px; margin: 2px 0; }
  .header .title { font-size: 16px; font-weight: 700; color: #059669; margin-top: 8px; }
  table { width: 100%; border-collapse: collapse; margin-top: 12px; }
  th, td { border: 1px solid #cbd5e1; padding: 8px 10px; text-align: right; }
  th { background: #059669; color: #fff; font-weight: 600; }
  tr:nth-child(even) { background: #f8fafc; }
  .footer { margin-top: 16px; font-size: 11px; color: #64748b; text-align: center; }
  @media print {
    body { padding: 0; }
    .no-print { display: none; }
  }
</style>
</head>
<body>
  <div class="header">
    ${opts.companyLogo ? `<img class="logo" src="${opts.companyLogo}" alt="شعار المحل" />` : ''}
    ${company ? `<h1>${escapeHtml(company)}</h1>` : ''}
    ${phone ? `<div class="phone">${escapeHtml(phone.startsWith('هاتف') ? phone : 'هاتف: ' + phone)}</div>` : ''}
    <div class="title">${escapeHtml(opts.title)}</div>
  </div>
  <table>
    <thead><tr>${thead}</tr></thead>
    <tbody>${tbody || '<tr><td colspan="99">لا توجد بيانات</td></tr>'}</tbody>
  </table>
  <div class="footer">${escapeHtml(opts.footerNote || 'Agri Plus — ' + new Date().toLocaleString('ar-EG'))}</div>
  ${autoPrint ? `<script>
    window.onload = function() {
      setTimeout(function() { window.print(); }, 250);
    };
  </script>` : ''}
</body>
</html>`;
}

/** طباعة / حفظ PDF بوضوح عربي كامل */
export function printRtlReport(opts: PrintReportOptions) {
  if (isCapacitorNative()) {
    // على الهاتف: window.open()+window.print() غير موثوقين إطلاقاً داخل
    // WebView أندرويد (نفس مشكلة "<a download>" التي واجهناها مع تصدير
    // النسخة الاحتياطية) — بدلاً منهما، نكتب التقرير كملف HTML حقيقي عبر
    // Filesystem ثم نفتح قائمة مشاركة أندرويد الأصلية. يمكن للمستخدم فتحه
    // في متصفح حقيقي (كروم) ثم الطباعة/الحفظ كـ PDF من قائمة كروم نفسها —
    // وهي ميزة طباعة موثوقة تماماً على عكس WebView المُقيَّد
    exportReportMobile(opts).catch(err => {
      console.error('Mobile report export failed', err);
      alert('تعذّر تصدير التقرير: ' + (err?.message || 'خطأ غير معروف'));
    });
    return;
  }

  const html = buildReportHtml(opts, true);
  const w = window.open('', '_blank');
  if (!w) {
    alert('اسمح بالنوافذ المنبثقة لتصدير التقرير');
    return;
  }
  w.document.open();
  w.document.write(html);
  w.document.close();
}

/** مسار الهاتف: يكتب التقرير كملف HTML فعلي ثم يفتح قائمة المشاركة الأصلية */
async function exportReportMobile(opts: PrintReportOptions): Promise<void> {
  const html = buildReportHtml(opts, false);
  const filename = `${(opts.title || 'تقرير').replace(/[^\u0600-\u06FFa-zA-Z0-9]+/g, '-')}-${new Date().toISOString().slice(0, 10)}.html`;

  const result = await Filesystem.writeFile({
    path: filename,
    data: html,
    directory: Directory.Documents,
    encoding: Encoding.UTF8
  });

  await Share.share({
    title: opts.title,
    text: 'تقرير من Agri Plus — افتحه في المتصفح للطباعة أو الحفظ كـ PDF',
    url: result.uri,
    dialogTitle: 'فتح التقرير أو مشاركته'
  });
}



function escapeHtml(s: string) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** توافق مع الاستدعاءات القديمة */
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

export async function exportPdf(opts: {
  title: string;
  companyName?: string;
  subtitle?: string;
  companyPhone?: string;
  companyLogo?: string;
  head: string[];
  body: (string | number)[][];
  filename?: string;
  orientation?: 'portrait' | 'landscape';
  ltrColumns?: number[];
}) {
  // استخدم الطباعة HTML لضمان وضوح العربية
  printRtlReport({
    title: opts.title,
    companyName: opts.companyName,
    companyPhone: opts.companyPhone || opts.subtitle,
    companyLogo: opts.companyLogo,
    subtitle: opts.subtitle,
    headers: opts.head,
    rows: opts.body,
    footerNote: opts.filename || undefined
  });
}


export async function exportArabicTablePdf(opts: {
  title: string;
  headers: string[];
  rows: (string | number)[][];
  fileName?: string;
  companyName?: string;
  companyPhone?: string;
  companyLogo?: string;
  subtitle?: string;
  orientation?: 'portrait' | 'landscape';
  ltrColumns?: number[];
}) {
  printRtlReport({
    title: opts.title,
    companyName: opts.companyName,
    companyPhone: opts.companyPhone || opts.subtitle,
    companyLogo: opts.companyLogo,
    headers: opts.headers,
    rows: opts.rows,
    footerNote: opts.fileName
  });
}
