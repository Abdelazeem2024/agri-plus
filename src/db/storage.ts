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
  profitPassword: '1234'
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
      const parsed = JSON.parse(raw) as AppData;
      // Ensure new fields exist
      if (!parsed.representativeReturns) parsed.representativeReturns = [];
      memoryCache = parsed;
      return parsed;
    }
  } catch { /* ignore */ }

  const data = getDefaultData();
  memoryCache = data;
  return data;
}

/** Call once on app start in Electron to load from SQLite */
export async function loadDataAsync(): Promise<AppData> {
  if (isElectron()) {
    try {
      const res = await (window as any).electronAPI.dbLoad();
      if (res?.success && res.data) {
        if (!res.data.representativeReturns) res.data.representativeReturns = [];
        memoryCache = res.data;
        // Keep a localStorage mirror for fast boot next time
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(res.data)); } catch { /* quota */ }
        return res.data;
      }
    } catch (e) {
      console.error('SQLite load failed, using localStorage', e);
    }
  }
  return loadData();
}

export function saveData(data: AppData): void {
  memoryCache = data;

  // Always mirror to localStorage (fast + backup)
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch { /* ignore quota */ }

  // Debounced save to SQLite in Electron
  if (isElectron()) {
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(async () => {
      try {
        await (window as any).electronAPI.dbSave(data);
      } catch (e) {
        console.error('SQLite save failed', e);
      }
    }, 300);
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

export function importFromJSON(json: string): { success: boolean; message: string; summary?: any } {
  try {
    const incoming = JSON.parse(json) as AppData;
    if (!incoming.customers || !Array.isArray(incoming.customers)) {
      return { success: false, message: 'ملف غير صالح' };
    }
    if (!incoming.representativeReturns) incoming.representativeReturns = [];
    const summary = {
      customers: incoming.customers?.length || 0,
      products: incoming.products?.length || 0,
      invoices: incoming.invoices?.length || 0,
      representatives: incoming.representatives?.length || 0
    };
    saveData(incoming);
    if (isElectron()) {
      (window as any).electronAPI.dbImportJson(json).catch(() => {});
    }
    return { success: true, message: 'تم الاستيراد بنجاح', summary };
  } catch (e: any) {
    return { success: false, message: e.message || 'خطأ في قراءة الملف' };
  }
}

export function getTrialDaysLeft(): number {
  const data = loadData();
  if (data.license.activated) return 999;
  const start = new Date(data.trialStart).getTime();
  const elapsed = Math.floor((Date.now() - start) / (1000 * 60 * 60 * 24));
  return Math.max(0, 3 - elapsed);
}

export function isLicenseValid(): boolean {
  const data = loadData();
  if (data.license.activated) {
    if (data.license.type === 'permanent') return true;
    if (data.license.type === 'yearly' && data.license.expiresAt) {
      return new Date(data.license.expiresAt) > new Date();
    }
  }
  return getTrialDaysLeft() > 0;
}

export function getStorageMode(): 'sqlite' | 'localStorage' {
  return isElectron() ? 'sqlite' : 'localStorage';
}
