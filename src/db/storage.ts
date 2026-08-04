import type {
  Customer, Representative, Product, Invoice, Collection, Return,
  StockReceipt, Payment, StockMovement, RepresentativeReturn,
  CompanySettings, LicenseInfo, AuditLog, InventoryLayer
} from '../types';
import { generateId } from '../lib/utils';

const STORAGE_KEY = 'agri-plus-data';

export interface AppData {
  customers: Customer[];
  representatives: Representative[];
  products: Product[];
  invoices: Invoice[];
  collections: Collection[];
  returns: Return[];
  stockReceipts: StockReceipt[];
  inventoryLayers: InventoryLayer[];
  representativeReturns: RepresentativeReturn[];
  payments: Payment[];
  stockMovements: StockMovement[];
  settings: CompanySettings;
  license: LicenseInfo;
  auditLogs: AuditLog[];
  trialStart: string;
}

const defaultSettings: CompanySettings = {
  name: 'شركة المبيدات الزراعية',
  phone: '',
  address: '',
  currency: 'ج.م',
  profitPassword: ''
};

const defaultLicense: LicenseInfo = {
  activated: false,
  type: 'trial',
  machineId: ''
};

function getDefaultData(): AppData {
  return {
    customers: [],
    representatives: [],
    products: [],
    invoices: [],
    collections: [],
    returns: [],
    stockReceipts: [],
    inventoryLayers: [],
    representativeReturns: [],
    payments: [],
    stockMovements: [],
    settings: { ...defaultSettings },
    license: { ...defaultLicense },
    auditLogs: [],
    trialStart: new Date().toISOString()
  };
}

function isElectron(): boolean {
  return typeof window !== 'undefined' && !!(window as any).electronAPI?.dbLoad;
}

/** In-memory cache after first load from SQLite */
let memoryCache: AppData | null = null;
let saveTimer: ReturnType<typeof setTimeout> | null = null;

export function loadData(): AppData {
  // Prefer memory cache (kept in sync)
  if (memoryCache) return memoryCache;

  // Electron + SQLite path is async via loadDataAsync; sync fallback for first paint
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      // يضمن اكتمال كل الحقول حتى لو كانت النسخة المخزّنة قديمة أو ناقصة
      const normalized = normalizeData(parsed);
      memoryCache = normalized;
      return normalized;
    }
  } catch { /* ignore */ }

  const data = getDefaultData();
  memoryCache = data;
  return data;
}

function countRecords(d: AppData): number {
  return (d.customers?.length || 0) + (d.products?.length || 0) + (d.invoices?.length || 0)
    + (d.representatives?.length || 0) + (d.stockReceipts?.length || 0) + (d.collections?.length || 0);
}

function asArray<T = any>(v: any): T[] {
  return Array.isArray(v) ? v : [];
}

/**
 * يضمن أن أي كائن بيانات (سواء قادم من localStorage، SQLite، أو ملف JSON مستورد
 * من نسخة قديمة/ناقصة) يحتوي دائماً على كل الحقول المطلوبة بالشكل الصحيح.
 * بدون هذا، أي حقل ناقص في ملف مستورد قديم كان يتسبب في تعطل الشاشات التي
 * تعتمد عليه (مثل .filter/.map على undefined) بعد الاستيراد مباشرة.
 */
function normalizeData(d: any): AppData {
  const base = getDefaultData();
  return {
    customers: asArray(d?.customers),
    representatives: asArray(d?.representatives),
    products: asArray(d?.products),
    invoices: asArray(d?.invoices),
    collections: asArray(d?.collections),
    returns: asArray(d?.returns),
    stockReceipts: asArray(d?.stockReceipts),
    inventoryLayers: asArray(d?.inventoryLayers),
    representativeReturns: asArray(d?.representativeReturns),
    payments: asArray(d?.payments),
    stockMovements: asArray(d?.stockMovements),
    settings: { ...defaultSettings, ...(d?.settings && typeof d.settings === 'object' ? d.settings : {}) },
    license: { ...defaultLicense, ...(d?.license && typeof d.license === 'object' ? d.license : {}) },
    auditLogs: asArray(d?.auditLogs),
    trialStart: (typeof d?.trialStart === 'string' && d.trialStart) || base.trialStart
  } as AppData;
}

/** Call once on app start in Electron to load from SQLite */
export async function loadDataAsync(): Promise<AppData> {
  const local = loadData();

  if (isElectron() && (window as any).electronAPI?.dbLoad) {
    try {
      const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error('dbLoad timeout')), 4000));
      const res: any = await Promise.race([(window as any).electronAPI.dbLoad(), timeout]);
      if (res?.success && res.data) {
        const sqliteData = normalizeData(res.data);
        if (countRecords(sqliteData) === 0 && countRecords(local) > 0) {
          memoryCache = local;
          try { await (window as any).electronAPI.dbSave(local); } catch { /* ignore */ }
          return local;
        }
        memoryCache = sqliteData;
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(sqliteData)); } catch { /* quota */ }
        return sqliteData;
      }
    } catch (e) {
      console.error('SQLite load failed, using localStorage', e);
    }
  }
  memoryCache = local;
  return local;
}

export function saveData(data: AppData): void {
  memoryCache = data;

  // Always mirror to localStorage immediately (backup)
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch { /* ignore quota */ }

  // Save to SQLite in Electron (short debounce to batch rapid clicks, always flushes)
  if (isElectron()) {
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(async () => {
      try {
        const res = await (window as any).electronAPI.dbSave(memoryCache);
        if (res && res.success === false) {
          console.error('SQLite save error:', res.error);
        }
      } catch (e) {
        console.error('SQLite save failed', e);
      }
    }, 150);
  }
}

/** Force immediate SQLite flush */
export async function flushToSqlite(): Promise<void> {
  if (!isElectron() || !memoryCache) return;
  if (saveTimer) {
    clearTimeout(saveTimer);
    saveTimer = null;
  }
  await (window as any).electronAPI.dbSave(memoryCache);
}

export function addAudit(action: string, entity: string, entityId: string, details: string) {
  const data = loadData();
  data.auditLogs.unshift({
    id: generateId(),
    action,
    entity,
    entityId,
    details,
    timestamp: new Date().toISOString()
  });
  if (data.auditLogs.length > 500) data.auditLogs = data.auditLogs.slice(0, 500);
  saveData(data);
}

export function exportToJSON(): string {
  return JSON.stringify(loadData(), null, 2);
}

export async function exportToJSONAsync(): Promise<string> {
  if (isElectron()) {
    const res = await (window as any).electronAPI.dbExportJson();
    if (res?.success) return res.data;
  }
  return exportToJSON();
}

export async function importFromJSON(json: string): Promise<{ success: boolean; message: string; summary?: any }> {
  try {
    const incoming = JSON.parse(json);
    if (!incoming || !Array.isArray(incoming.customers)) {
      return { success: false, message: 'ملف غير صالح: لا يحتوي على بيانات عملاء صحيحة' };
    }

    // يضمن اكتمال كل الحقول بغض النظر عن نسخة الملف المصدَّر منها (قديم أو ناقص)
    const normalized = normalizeData(incoming);
    const summary = {
      customers: normalized.customers.length,
      products: normalized.products.length,
      invoices: normalized.invoices.length,
      representatives: normalized.representatives.length,
      collections: normalized.collections.length,
      stockReceipts: normalized.stockReceipts.length,
      returns: normalized.returns.length,
      representativeReturns: normalized.representativeReturns.length
    };

    // في نسخة Electron: اكتب في قاعدة البيانات SQLite أولاً وتأكد من نجاح العملية
    // قبل اعتماد البيانات — بدل تجاهل الخطأ بصمت كما كان يحدث سابقاً (كان يمكن أن
    // يفشل الاستيراد في القاعدة دون أن يعرف المستخدم، وتعود بياناته القديمة بعد إعادة التشغيل)
    if (isElectron()) {
      try {
        const res: any = await (window as any).electronAPI.dbImportJson(JSON.stringify(normalized));
        if (!res || res.success === false) {
          return { success: false, message: 'فشل حفظ البيانات المستوردة في قاعدة البيانات: ' + (res?.message || 'خطأ غير معروف') };
        }
      } catch (e: any) {
        return { success: false, message: 'تعذّر الاتصال بقاعدة البيانات أثناء الاستيراد: ' + (e?.message || '') };
      }
    }

    saveData(normalized);
    return { success: true, message: 'تم الاستيراد بنجاح', summary };
  } catch (e: any) {
    return { success: false, message: e.message || 'خطأ في قراءة الملف' };
  }
}

export function getTrialDaysLeft(): number {
  const data = memoryCache || loadData();
  if (data.license?.activated) {
    if (data.license.type === 'yearly' && data.license.expiresAt) {
      const ms = new Date(data.license.expiresAt).getTime() - Date.now();
      if (ms <= 0) return 0; // منتهي
      return Math.max(1, Math.ceil(ms / (1000 * 60 * 60 * 24)));
    }
    return 999; // دائم
  }
  const start = new Date(data.trialStart || new Date().toISOString()).getTime();
  const elapsed = Date.now() - start;
  const left = 3 - Math.floor(elapsed / (1000 * 60 * 60 * 24));
  return Math.max(0, left);
}

export function isLicenseValid(): boolean {
  const data = memoryCache || loadData();
  if (data.license?.activated) {
    if (data.license.type === 'yearly' && data.license.expiresAt) {
      return new Date(data.license.expiresAt).getTime() > Date.now();
    }
    // permanent أو نوع غير سنوي
    return true;
  }
  return getTrialDaysLeft() > 0;
}

export function getStorageMode(): 'sqlite' | 'localStorage' {
  return isElectron() ? 'sqlite' : 'localStorage';
}
