/**
 * محرك الفهم الذكي — Agri Plus AI
 * =================================
 * محرك قواعد (Rules Engine) لفهم الأوامر والأسئلة بالعربية، بدون أي اتصال
 * إنترنت وبدون أي نموذج توليدي ضخم — كل المنطق هنا نص برمجي عادي يعمل فوراً
 * وبحجم شبه معدوم. مصمَّم خصيصاً لمفردات محلات المبيدات الزراعية.
 *
 * الفلسفة: "الفهم قبل التنفيذ" — إذا لم يكن المحرك واثقاً من فهم الطلب، يطلب
 * توضيحاً بدل التخمين. هذا مبدأ إلزامي في كل هذا الملف.
 */
import type { AppData } from '../db/storage';

// ─────────────────────────── تطبيع النصوص العربية ───────────────────────────

/** يوحّد أشكال الحروف العربية المختلفة (الألف، التاء المربوطة، الياء) قبل أي مطابقة */
export function normalizeArabic(text: string): string {
  return text
    .replace(/[أإآا]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/[ىي]/g, 'ي')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
    .replace(/[\u064B-\u0652]/g, '') // إزالة التشكيل
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

/** مسافة Levenshtein للمطابقة التقريبية (تحمّل الأخطاء الإملائية وأخطاء نطق الصوت) */
function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
    }
  }
  return dp[m][n];
}

/** تشابه نسبي بين 0 و1 (1 = تطابق تام) — مبني على Levenshtein */
function similarity(a: string, b: string): number {
  const na = normalizeArabic(a), nb = normalizeArabic(b);
  if (!na || !nb) return 0;
  const dist = levenshtein(na, nb);
  return 1 - dist / Math.max(na.length, nb.length);
}

/** يبحث عن أفضل تطابق تقريبي لاسم (عميل/مندوب/صنف) داخل قائمة أسماء */
function fuzzyFind<T extends { name: string }>(query: string, list: T[], threshold = 0.55): T | null {
  let best: T | null = null;
  let bestScore = threshold;
  const nq = normalizeArabic(query);
  for (const item of list) {
    const nn = normalizeArabic(item.name);
    if (nn.includes(nq) || nq.includes(nn)) return item;
    const score = similarity(query, item.name);
    if (score > bestScore) { bestScore = score; best = item; }
  }
  return best;
}

// ─────────────────────────── استخراج الكيانات (Entities) ───────────────────────────

function extractDateRange(text: string): { from: string; to: string; label: string } | null {
  const n = normalizeArabic(text);
  const today = new Date();
  const fmt = (d: Date) => d.toISOString().slice(0, 10);

  if (/(اليوم|النهارده|النهاردة)/.test(n)) {
    return { from: fmt(today), to: fmt(today), label: 'اليوم' };
  }
  if (/(امبارح|البارحه|الامس)/.test(n)) {
    const y = new Date(today); y.setDate(y.getDate() - 1);
    return { from: fmt(y), to: fmt(y), label: 'أمس' };
  }
  if (/(الاسبوع|هالاسبوع|أسبوع)/.test(n)) {
    const from = new Date(today); from.setDate(from.getDate() - 7);
    return { from: fmt(from), to: fmt(today), label: 'آخر أسبوع' };
  }
  if (/(الشهر|هالشهر|شهر)/.test(n)) {
    const from = new Date(today.getFullYear(), today.getMonth(), 1);
    return { from: fmt(from), to: fmt(today), label: 'هذا الشهر' };
  }
  if (/(السنه|السنة|هالسنه|العام)/.test(n)) {
    const from = new Date(today.getFullYear(), 0, 1);
    return { from: fmt(from), to: fmt(today), label: 'هذه السنة' };
  }
  return null;
}

// ─────────────────────────── تصنيف النية (Intent) ───────────────────────────

export type IntentType =
  | 'profit_summary'
  | 'customer_debt'
  | 'customers_with_debt'
  | 'sales_summary'
  | 'collections_summary'
  | 'low_stock'
  | 'top_customers'
  | 'product_stock'
  | 'unknown';

interface IntentPattern {
  type: IntentType;
  keywords: string[][];
}

const INTENT_PATTERNS: IntentPattern[] = [
  { type: 'profit_summary', keywords: [['ربح', 'ارباح', 'صافي'], []] },
  { type: 'customers_with_debt', keywords: [['عملاء', 'زباين'], ['مديونين', 'مديونيه', 'عليهم', 'متاخرين']] },
  { type: 'sales_summary', keywords: [['مبيعات', 'بيع', 'فواتير'], []] },
  { type: 'collections_summary', keywords: [['تحصيلات', 'تحصيل', 'محصل'], []] },
  { type: 'low_stock', keywords: [['مخزون', 'اصناف', 'صنف'], ['قارب', 'ناقص', 'اوشك', 'قرب', 'خلص']] },
  { type: 'top_customers', keywords: [['اكثر', 'اكتر', 'افضل', 'اعلى'], ['عملاء', 'عميل']] },
  { type: 'product_stock', keywords: [['رصيد', 'مخزون', 'كميه', 'موجود'], ['صنف', 'منتج']] }
];

/** عبارات السؤال عن مديونية شخص (عميل أو مندوب) بدون ذكر كلمة "عميل"/"مندوب" صراحة —
 * هذا هو الأسلوب الطبيعي الفعلي الذي يتكلم به الناس ("فلان عليه كام؟") */
const DEBT_INQUIRY_RE = /(عليه|عليها|له|مديون|رصيد|حساب|مستحق)\s*(كام|ايه|قد ايه)?|كام\s*(عليه|عليها|له)/;

function matchIntent(text: string): { intent: IntentType; personQuery?: string } {
  const n = normalizeArabic(text);

  // أولاً: النوايا ذات الكلمات المفتاحية الصريحة والأكثر تحديداً (مبيعات، تحصيلات،
  // مخزون...) — لها الأولوية دائماً لأنها أقل احتمالاً للالتباس من عبارة "عليه كام"
  // العامة (التي قد تتشابه لفظياً مع كلمات مثل "رصيد صنف" أو "عليهم" داخل "العملاء
  // المديونين" مثلاً)
  let best: IntentType = 'unknown';
  let bestHits = 0;
  for (const p of INTENT_PATTERNS) {
    let hits = 0;
    for (const group of p.keywords) {
      if (group.length === 0) continue;
      if (group.some(kw => n.includes(normalizeArabic(kw)))) hits++;
    }
    const requiredGroups = p.keywords.filter(g => g.length > 0).length;
    if (hits === requiredGroups && hits > bestHits) { bestHits = hits; best = p.type; }
  }
  if (best !== 'unknown') return { intent: best };

  // ثانياً (احتياطي فقط): عبارة "فلان عليه كام" الطبيعية — نستخرج الاسم المحتمل
  if (DEBT_INQUIRY_RE.test(n)) {
    const personQuery = text.replace(/(عليه|عليها|له|مديون|رصيد|حساب|مستحق|كام|ايه|قد ايه|\?|؟)/g, ' ').trim();
    if (personQuery) return { intent: 'customer_debt', personQuery };
  }

  return { intent: 'unknown' };
}

// ─────────────────────────── نتيجة التنفيذ ───────────────────────────

export interface AIResult {
  understood: boolean;
  intent: IntentType;
  title: string;
  needsClarification?: string;
  summary?: string;
  stats?: { label: string; value: string; tone?: 'good' | 'bad' | 'neutral' }[];
  table?: { headers: string[]; rows: (string | number)[][] };
}

function money(n: number) {
  return n.toLocaleString('ar-EG', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function understandAndExecute(rawText: string, data: AppData): AIResult {
  const text = rawText.trim();
  if (!text) {
    return { understood: false, intent: 'unknown', title: 'لم أسمع شيئاً', needsClarification: 'أعد المحاولة من فضلك.' };
  }

  const { intent, personQuery } = matchIntent(text);
  const dateRange = extractDateRange(text);

  switch (intent) {
    case 'profit_summary': {
      const invoices = dateRange ? data.invoices.filter(i => i.date >= dateRange.from && i.date <= dateRange.to) : data.invoices;
      const returns = dateRange ? data.returns.filter(r => r.date >= dateRange.from && r.date <= dateRange.to) : data.returns;
      const sales = invoices.reduce((s, i) => s + i.total, 0);
      const cost = invoices.reduce((s, inv) => s + inv.items.reduce((is, it) => is + ((it.costAtSale ?? 0) * it.quantity), 0), 0);
      const returnsTotal = returns.reduce((s, r) => s + r.total, 0);
      const returnsCost = returns.reduce((s, r) => s + (r.totalCost ?? 0), 0);
      const netProfit = sales - cost - returnsTotal + returnsCost;
      return {
        understood: true,
        intent,
        title: `صافي الربح — ${dateRange?.label || 'كل الفترات'}`,
        summary: `صافي الربح ${dateRange?.label || 'الإجمالي'} هو ${money(netProfit)} جنيه، من ${invoices.length} فاتورة.`,
        stats: [
          { label: 'المبيعات', value: money(sales) },
          { label: 'التكلفة', value: money(cost) },
          { label: 'المرتجعات', value: money(returnsTotal), tone: 'bad' },
          { label: 'صافي الربح', value: money(netProfit), tone: netProfit >= 0 ? 'good' : 'bad' }
        ]
      };
    }

    case 'sales_summary': {
      const invoices = dateRange ? data.invoices.filter(i => i.date >= dateRange.from && i.date <= dateRange.to) : data.invoices;
      const total = invoices.reduce((s, i) => s + i.total, 0);
      return {
        understood: true,
        intent,
        title: `المبيعات — ${dateRange?.label || 'كل الفترات'}`,
        summary: `إجمالي المبيعات ${dateRange?.label || ''} هو ${money(total)} جنيه من ${invoices.length} فاتورة.`,
        stats: [
          { label: 'عدد الفواتير', value: String(invoices.length) },
          { label: 'إجمالي المبيعات', value: money(total), tone: 'good' }
        ],
        table: {
          headers: ['رقم الفاتورة', 'العميل', 'التاريخ', 'المبلغ'],
          rows: invoices.slice(-15).reverse().map(i => [i.number, i.customerName, i.date, money(i.total)])
        }
      };
    }

    case 'collections_summary': {
      const cols = dateRange ? data.collections.filter(c => c.date >= dateRange.from && c.date <= dateRange.to) : data.collections;
      const total = cols.reduce((s, c) => s + c.amount, 0);
      return {
        understood: true,
        intent,
        title: `التحصيلات — ${dateRange?.label || 'كل الفترات'}`,
        summary: `إجمالي ما تم تحصيله ${dateRange?.label || ''} هو ${money(total)} جنيه.`,
        stats: [{ label: 'إجمالي التحصيلات', value: money(total), tone: 'good' }]
      };
    }

    case 'customers_with_debt': {
      const rows = data.customers.map(c => {
        const opening = c.openingBalance || 0;
        const inv = data.invoices.filter(i => i.customerId === c.id).reduce((s, i) => s + i.total, 0);
        const col = data.collections.filter(x => x.customerId === c.id).reduce((s, x) => s + x.amount, 0);
        const ret = data.returns.filter(r => r.customerId === c.id).reduce((s, r) => s + r.total, 0);
        const refund = data.returns.filter(r => r.customerId === c.id).reduce((s, r) => s + (r.refundAmount || 0), 0);
        const balance = opening + inv - col - ret + refund;
        return { name: c.name, phone: c.phone, balance };
      }).filter(c => c.balance > 0).sort((a, b) => b.balance - a.balance);

      if (rows.length === 0) {
        return { understood: true, intent, title: 'العملاء المديونون', summary: 'لا يوجد أي عميل عليه مديونية حالياً — ممتاز!' };
      }
      const totalDebt = rows.reduce((s, r) => s + r.balance, 0);
      return {
        understood: true,
        intent,
        title: 'العملاء المديونون',
        summary: `يوجد ${rows.length} عميلاً عليهم مديونية، بإجمالي ${money(totalDebt)} جنيه.`,
        stats: [
          { label: 'عدد العملاء المديونين', value: String(rows.length) },
          { label: 'إجمالي المديونيات', value: money(totalDebt), tone: 'bad' }
        ],
        table: { headers: ['العميل', 'الهاتف', 'المديونية'], rows: rows.map(r => [r.name, r.phone || '—', money(r.balance)]) }
      };
    }

    case 'customer_debt': {
      // نبحث بالاسم في العملاء والمندوبين معاً (المستخدم غالباً يذكر الاسم فقط
      // دون توضيح "عميل" أو "مندوب" — هذا هو الأسلوب الطبيعي في الكلام)
      const query = personQuery || text;
      const customer = fuzzyFind(query, data.customers);
      const rep = fuzzyFind(query, data.representatives);

      if (!customer && !rep) {
        return { understood: false, intent, title: 'لم أتعرّف على الاسم', needsClarification: 'من فضلك اذكر اسم العميل أو المندوب بوضوح أكبر.' };
      }

      if (customer && (!rep || normalizeArabic(customer.name).includes(normalizeArabic(query)))) {
        const opening = customer.openingBalance || 0;
        const inv = data.invoices.filter(i => i.customerId === customer.id).reduce((s, i) => s + i.total, 0);
        const col = data.collections.filter(x => x.customerId === customer.id).reduce((s, x) => s + x.amount, 0);
        const ret = data.returns.filter(r => r.customerId === customer.id).reduce((s, r) => s + r.total, 0);
        const refund = data.returns.filter(r => r.customerId === customer.id).reduce((s, r) => s + (r.refundAmount || 0), 0);
        const balance = opening + inv - col - ret + refund;
        return {
          understood: true,
          intent,
          title: `كشف حساب مبسّط — العميل ${customer.name}`,
          summary: balance > 0
            ? `العميل ${customer.name} عليه مديونية قدرها ${money(balance)} جنيه.`
            : `لا توجد مديونية على العميل ${customer.name} حالياً.`,
          stats: [
            { label: 'إجمالي المشتريات', value: money(inv) },
            { label: 'إجمالي المدفوع', value: money(col) },
            { label: 'الرصيد الحالي', value: money(balance), tone: balance > 0 ? 'bad' : 'good' }
          ]
        };
      }

      // وإلا فالمقصود مندوب
      const repFound = rep!;
      const received = data.stockReceipts.filter(s => s.representativeId === repFound.id).reduce((s, r) => s + (r.totalValue || 0), 0);
      const paid = data.payments.filter(p => p.representativeId === repFound.id).reduce((s, p) => s + p.amount, 0);
      const retVal = (data.representativeReturns || []).filter(r => r.representativeId === repFound.id).reduce((s, r) => s + r.totalValue, 0);
      const balance = received - paid - retVal;
      return {
        understood: true,
        intent,
        title: `كشف حساب مبسّط — المندوب ${repFound.name}`,
        summary: balance > 0
          ? `المحل مديون للمندوب ${repFound.name} بمبلغ ${money(balance)} جنيه.`
          : `لا توجد مديونية على المحل تجاه المندوب ${repFound.name}.`,
        stats: [
          { label: 'إجمالي البضاعة المستلمة', value: money(received) },
          { label: 'إجمالي المدفوع له', value: money(paid) },
          { label: 'الرصيد الحالي', value: money(balance), tone: balance > 0 ? 'bad' : 'good' }
        ]
      };
    }

    case 'low_stock': {
      const rows = data.products.filter(p => p.currentStock <= p.minStock)
        .sort((a, b) => a.currentStock - b.currentStock);
      if (rows.length === 0) {
        return { understood: true, intent, title: 'حالة المخزون', summary: 'كل الأصناف فوق الحد الأدنى — لا يوجد نقص حالياً.' };
      }
      return {
        understood: true,
        intent,
        title: 'أصناف قاربت على النفاد',
        summary: `يوجد ${rows.length} صنفاً وصل أو اقترب من الحد الأدنى للمخزون.`,
        stats: [{ label: 'عدد الأصناف الناقصة', value: String(rows.length), tone: 'bad' }],
        table: { headers: ['الصنف', 'الرصيد الحالي', 'الحد الأدنى'], rows: rows.map(p => [p.name, p.currentStock, p.minStock]) }
      };
    }

    case 'product_stock': {
      const product = fuzzyFind(text, data.products);
      if (!product) {
        return { understood: false, intent, title: 'لم أتعرّف على اسم الصنف', needsClarification: 'من فضلك اذكر اسم الصنف بوضوح أكبر.' };
      }
      return {
        understood: true,
        intent,
        title: `رصيد المخزون — ${product.name}`,
        summary: `الرصيد الحالي لصنف ${product.name} هو ${product.currentStock} وحدة.`,
        stats: [
          { label: 'الرصيد الحالي', value: String(product.currentStock), tone: product.currentStock <= product.minStock ? 'bad' : 'good' },
          { label: 'الحد الأدنى', value: String(product.minStock) },
          { label: 'سعر البيع', value: money(product.salePrice) }
        ]
      };
    }

    case 'top_customers': {
      const map: Record<string, { name: string; total: number }> = {};
      for (const inv of data.invoices) {
        const key = inv.customerId || inv.customerName;
        if (!map[key]) map[key] = { name: inv.customerName, total: 0 };
        map[key].total += inv.total;
      }
      const rows = Object.values(map).sort((a, b) => b.total - a.total).slice(0, 10);
      return {
        understood: true,
        intent,
        title: 'أكثر العملاء شراءً',
        summary: rows.length ? `العميل الأول هو ${rows[0].name} بإجمالي مشتريات ${money(rows[0].total)} جنيه.` : 'لا توجد بيانات كافية بعد.',
        table: { headers: ['الترتيب', 'العميل', 'إجمالي المشتريات'], rows: rows.map((r, i) => [i + 1, r.name, money(r.total)]) }
      };
    }

    default:
      return {
        understood: false,
        intent: 'unknown',
        title: 'لم أفهم الطلب بدقة',
        needsClarification: 'جرّب صياغة أوضح، مثل: "كام صافي الربح الشهر ده؟" أو "مين العملاء اللي عليهم فلوس؟" أو "كام رصيد صنف كذا؟"'
      };
  }
}
