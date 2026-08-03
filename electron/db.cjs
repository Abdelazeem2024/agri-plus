/**
 * Agri Plus - SQLite Database (better-sqlite3)
 * Runs in Electron Main Process only.
 */
let Database;
try {
  Database = require('better-sqlite3');
} catch (e) {
  console.error('better-sqlite3 load failed:', e.message);
  Database = null;
}
const path = require('path');
const fs = require('fs');
const { app } = require('electron');

let db = null;

function getDbPath() {
  const userData = app.getPath('userData');
  const dir = path.join(userData, 'data');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return path.join(dir, 'agri-plus.db');
}

function initDatabase() {
  if (!Database) {
    throw new Error('SQLite unavailable');
  }
  if (db) return db;
  const dbPath = getDbPath();
  db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  // Migrations for existing user databases
  const migrate = (sql) => { try { db.exec(sql); } catch (_) {} };
  migrate('ALTER TABLE representatives ADD COLUMN company TEXT DEFAULT ""');
  migrate('ALTER TABLE stock_receipts ADD COLUMN paid_amount REAL DEFAULT 0');
  migrate('ALTER TABLE stock_receipts ADD COLUMN total_value REAL DEFAULT 0');
  migrate('ALTER TABLE customers ADD COLUMN opening_balance REAL DEFAULT 0');
  migrate('ALTER TABLE returns ADD COLUMN total_cost REAL DEFAULT 0');


  db.exec(`
    CREATE TABLE IF NOT EXISTS meta (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS customers (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      phone TEXT DEFAULT '',
      address TEXT DEFAULT '',
      region TEXT DEFAULT '',
      notes TEXT DEFAULT '',
      status TEXT DEFAULT 'active',
      representative_id TEXT,
      opening_balance REAL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS representatives (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      phone TEXT DEFAULT '',
      company TEXT DEFAULT '',
      region TEXT DEFAULT '',
      notes TEXT DEFAULT '',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      trade_name TEXT DEFAULT '',
      active_ingredient TEXT DEFAULT '',
      concentration TEXT DEFAULT '',
      company TEXT DEFAULT '',
      unit TEXT DEFAULT 'عبوة',
      purchase_price REAL DEFAULT 0,
      sale_price REAL DEFAULT 0,
      min_stock REAL DEFAULT 0,
      current_stock REAL DEFAULT 0,
      category TEXT DEFAULT 'insecticide',
      notes TEXT DEFAULT '',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS invoices (
      id TEXT PRIMARY KEY,
      number TEXT NOT NULL,
      customer_id TEXT NOT NULL,
      customer_name TEXT NOT NULL,
      items_json TEXT NOT NULL,
      subtotal REAL DEFAULT 0,
      discount REAL DEFAULT 0,
      total REAL DEFAULT 0,
      notes TEXT DEFAULT '',
      date TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS collections (
      id TEXT PRIMARY KEY,
      customer_id TEXT NOT NULL,
      customer_name TEXT NOT NULL,
      amount REAL NOT NULL,
      date TEXT NOT NULL,
      notes TEXT DEFAULT '',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS returns (
      id TEXT PRIMARY KEY,
      invoice_id TEXT DEFAULT '',
      customer_id TEXT NOT NULL,
      customer_name TEXT NOT NULL,
      items_json TEXT NOT NULL,
      total REAL DEFAULT 0,
      total_cost REAL DEFAULT 0,
      date TEXT NOT NULL,
      notes TEXT DEFAULT '',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS stock_receipts (
      id TEXT PRIMARY KEY,
      representative_id TEXT NOT NULL,
      representative_name TEXT NOT NULL,
      items_json TEXT NOT NULL,
      date TEXT NOT NULL,
      notes TEXT DEFAULT '',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS representative_returns (
      id TEXT PRIMARY KEY,
      representative_id TEXT NOT NULL,
      representative_name TEXT NOT NULL,
      items_json TEXT NOT NULL,
      total_value REAL DEFAULT 0,
      paid_amount REAL DEFAULT 0,
      date TEXT NOT NULL,
      notes TEXT DEFAULT '',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS payments (
      id TEXT PRIMARY KEY,
      representative_id TEXT NOT NULL,
      representative_name TEXT NOT NULL,
      amount REAL NOT NULL,
      date TEXT NOT NULL,
      notes TEXT DEFAULT '',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS stock_movements (
      id TEXT PRIMARY KEY,
      product_id TEXT NOT NULL,
      product_name TEXT NOT NULL,
      type TEXT NOT NULL,
      quantity REAL NOT NULL,
      reference TEXT DEFAULT '',
      date TEXT NOT NULL,
      notes TEXT DEFAULT ''
    );

    CREATE TABLE IF NOT EXISTS settings (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      name TEXT DEFAULT '',
      phone TEXT DEFAULT '',
      address TEXT DEFAULT '',
      logo TEXT DEFAULT '',
      currency TEXT DEFAULT 'ج.م',
      profit_password TEXT DEFAULT '1234'
    );

    CREATE TABLE IF NOT EXISTS license (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      activated INTEGER DEFAULT 0,
      type TEXT DEFAULT 'trial',
      machine_id TEXT DEFAULT '',
      expires_at TEXT,
      activated_at TEXT
    );

    CREATE TABLE IF NOT EXISTS inventory_layers (
      id TEXT PRIMARY KEY,
      product_id TEXT NOT NULL,
      quantity REAL NOT NULL,
      unit_cost REAL NOT NULL,
      receipt_id TEXT NOT NULL,
      date TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      action TEXT NOT NULL,
      entity TEXT NOT NULL,
      entity_id TEXT DEFAULT '',
      details TEXT DEFAULT '',
      timestamp TEXT NOT NULL
    );

    INSERT OR IGNORE INTO settings (id, name, currency, profit_password) VALUES (1, 'شركة المبيدات الزراعية', 'ج.م', '1234');
    INSERT OR IGNORE INTO license (id, activated, type) VALUES (1, 0, 'trial');
    INSERT OR IGNORE INTO meta (key, value) VALUES ('trial_start', datetime('now'));
  `);

  return db;
}

function rowToCustomer(r) {
  return {
    id: r.id, name: r.name, phone: r.phone || '', address: r.address || '',
    region: r.region || '', notes: r.notes || '', status: r.status || 'active',
    representativeId: r.representative_id || undefined,
    openingBalance: r.opening_balance || 0,
    createdAt: r.created_at, updatedAt: r.updated_at
  };
}

function rowToRep(r) {
  return {
    id: r.id, name: r.name, phone: r.phone || '', region: r.region || '',
    notes: r.notes || '', createdAt: r.created_at, updatedAt: r.updated_at
  };
}

function rowToProduct(r) {
  return {
    id: r.id, name: r.name, tradeName: r.trade_name || '', activeIngredient: r.active_ingredient || '',
    concentration: r.concentration || '', company: r.company || '', unit: r.unit || 'عبوة',
    purchasePrice: r.purchase_price || 0, salePrice: r.sale_price || 0,
    minStock: r.min_stock || 0, currentStock: r.current_stock || 0,
    category: r.category || 'insecticide', notes: r.notes || '',
    createdAt: r.created_at, updatedAt: r.updated_at
  };
}

function loadAllData() {
  const database = initDatabase();

  const customers = database.prepare('SELECT * FROM customers ORDER BY name').all().map(rowToCustomer);
  const representatives = database.prepare('SELECT * FROM representatives ORDER BY name').all().map(rowToRep);
  const products = database.prepare('SELECT * FROM products ORDER BY name').all().map(rowToProduct);

  const invoices = database.prepare('SELECT * FROM invoices ORDER BY created_at DESC').all().map(r => ({
    id: r.id, number: r.number, customerId: r.customer_id, customerName: r.customer_name,
    items: JSON.parse(r.items_json || '[]'), subtotal: r.subtotal, discount: r.discount,
    total: r.total, notes: r.notes || '', date: r.date, createdAt: r.created_at, updatedAt: r.updated_at
  }));

  const collections = database.prepare('SELECT * FROM collections ORDER BY date DESC').all().map(r => ({
    id: r.id, customerId: r.customer_id, customerName: r.customer_name, amount: r.amount,
    date: r.date, notes: r.notes || '', createdAt: r.created_at
  }));

  const returns = database.prepare('SELECT * FROM returns ORDER BY date DESC').all().map(r => ({
    id: r.id, invoiceId: r.invoice_id || '', customerId: r.customer_id, customerName: r.customer_name,
    items: JSON.parse(r.items_json || '[]'), total: r.total, totalCost: r.total_cost || 0, date: r.date,
    notes: r.notes || '', createdAt: r.created_at
  }));

  const stockReceipts = database.prepare('SELECT * FROM stock_receipts ORDER BY date DESC').all().map(r => ({
    id: r.id, representativeId: r.representative_id, representativeName: r.representative_name,
    items: JSON.parse(r.items_json || '[]'), totalValue: r.total_value || 0, paidAmount: r.paid_amount || 0,
    date: r.date, notes: r.notes || '', createdAt: r.created_at
  }));

  const representativeReturns = database.prepare('SELECT * FROM representative_returns ORDER BY date DESC').all().map(r => ({
    id: r.id, representativeId: r.representative_id, representativeName: r.representative_name,
    items: JSON.parse(r.items_json || '[]'), totalValue: r.total_value || 0, paidAmount: r.paid_amount || 0,
    date: r.date, notes: r.notes || '', createdAt: r.created_at
  }));

  const payments = database.prepare('SELECT * FROM payments ORDER BY date DESC').all().map(r => ({
    id: r.id, representativeId: r.representative_id, representativeName: r.representative_name,
    amount: r.amount, date: r.date, notes: r.notes || '', createdAt: r.created_at
  }));

  const stockMovements = database.prepare('SELECT * FROM stock_movements ORDER BY date DESC LIMIT 2000').all().map(r => ({
    id: r.id, productId: r.product_id, productName: r.product_name, type: r.type,
    quantity: r.quantity, reference: r.reference || '', date: r.date, notes: r.notes || ''
  }));

  const settingsRow = database.prepare('SELECT * FROM settings WHERE id = 1').get();
  const settings = {
    name: settingsRow?.name || 'شركة المبيدات الزراعية',
    phone: settingsRow?.phone || '',
    address: settingsRow?.address || '',
    logo: settingsRow?.logo || undefined,
    currency: settingsRow?.currency || 'ج.م',
    profitPassword: settingsRow?.profit_password || '1234'
  };

  const licenseRow = database.prepare('SELECT * FROM license WHERE id = 1').get();
  const license = {
    activated: !!licenseRow?.activated,
    type: licenseRow?.type || 'trial',
    machineId: licenseRow?.machine_id || '',
    expiresAt: licenseRow?.expires_at || undefined,
    activatedAt: licenseRow?.activated_at || undefined
  };

  let inventoryLayers = [];
  try {
    inventoryLayers = database.prepare('SELECT * FROM inventory_layers').all().map(r => ({
      id: r.id, productId: r.product_id, quantity: r.quantity, unitCost: r.unit_cost,
      receiptId: r.receipt_id, date: r.date
    }));
  } catch (e) { inventoryLayers = []; }

  const auditLogs = database.prepare('SELECT * FROM audit_logs ORDER BY timestamp DESC LIMIT 500').all().map(r => ({
    id: r.id, action: r.action, entity: r.entity, entityId: r.entity_id || '',
    details: r.details || '', timestamp: r.timestamp
  }));

  let trialStart = database.prepare("SELECT value FROM meta WHERE key = 'trial_start'").get()?.value;
  if (!trialStart) {
    trialStart = new Date().toISOString();
    database.prepare("INSERT OR REPLACE INTO meta (key, value) VALUES ('trial_start', ?)").run(trialStart);
  }

  return {
    customers, representatives, products, invoices, collections, returns,
    stockReceipts, representativeReturns, payments, stockMovements,
    inventoryLayers,
    settings, license, auditLogs, trialStart
  };
}

function saveAllData(data) {
  const database = initDatabase();
  const tx = database.transaction(() => {
    // Clear and re-insert (simple full replace for reliability)
    database.exec(`
      DELETE FROM customers; DELETE FROM representatives; DELETE FROM products;
      DELETE FROM invoices; DELETE FROM collections; DELETE FROM returns;
      DELETE FROM stock_receipts; DELETE FROM representative_returns; DELETE FROM payments;
      DELETE FROM stock_movements; DELETE FROM audit_logs;
      DELETE FROM inventory_layers;
    `);

    const insCustomer = database.prepare(`INSERT INTO customers (id,name,phone,address,region,notes,status,representative_id,opening_balance,created_at,updated_at)
      VALUES (@id,@name,@phone,@address,@region,@notes,@status,@representativeId,@openingBalance,@createdAt,@updatedAt)`);
    for (const c of data.customers || []) {
      insCustomer.run({
        id: c.id, name: c.name, phone: c.phone || '', address: c.address || '',
        region: c.region || '', notes: c.notes || '', status: c.status || 'active',
        representativeId: c.representativeId || null, openingBalance: c.openingBalance || 0,
        createdAt: c.createdAt, updatedAt: c.updatedAt
      });
    }

    const insRep = database.prepare(`INSERT INTO representatives (id,name,phone,company,region,notes,created_at,updated_at)
      VALUES (@id,@name,@phone,@company,@region,@notes,@createdAt,@updatedAt)`);
    for (const r of data.representatives || []) {
      insRep.run({
        id: r.id, name: r.name, phone: r.phone || '', company: r.company || '',
        region: r.region || '', notes: r.notes || '', createdAt: r.createdAt, updatedAt: r.updatedAt
      });
    }

    const insProduct = database.prepare(`INSERT INTO products (id,name,trade_name,active_ingredient,concentration,company,unit,purchase_price,sale_price,min_stock,current_stock,category,notes,created_at,updated_at)
      VALUES (@id,@name,@tradeName,@activeIngredient,@concentration,@company,@unit,@purchasePrice,@salePrice,@minStock,@currentStock,@category,@notes,@createdAt,@updatedAt)`);
    for (const p of data.products || []) {
      insProduct.run({
        id: p.id, name: p.name, tradeName: p.tradeName || '', activeIngredient: p.activeIngredient || '',
        concentration: p.concentration || '', company: p.company || '', unit: p.unit || 'عبوة',
        purchasePrice: p.purchasePrice || 0, salePrice: p.salePrice || 0, minStock: p.minStock || 0,
        currentStock: p.currentStock || 0, category: p.category || 'insecticide', notes: p.notes || '',
        createdAt: p.createdAt, updatedAt: p.updatedAt
      });
    }

    const insInvoice = database.prepare(`INSERT INTO invoices (id,number,customer_id,customer_name,items_json,subtotal,discount,total,notes,date,created_at,updated_at)
      VALUES (@id,@number,@customerId,@customerName,@itemsJson,@subtotal,@discount,@total,@notes,@date,@createdAt,@updatedAt)`);
    for (const inv of data.invoices || []) {
      insInvoice.run({
        id: inv.id, number: inv.number, customerId: inv.customerId, customerName: inv.customerName,
        itemsJson: JSON.stringify(inv.items || []), subtotal: inv.subtotal || 0, discount: inv.discount || 0,
        total: inv.total || 0, notes: inv.notes || '', date: inv.date, createdAt: inv.createdAt, updatedAt: inv.updatedAt
      });
    }

    const insCol = database.prepare(`INSERT INTO collections (id,customer_id,customer_name,amount,date,notes,created_at)
      VALUES (@id,@customerId,@customerName,@amount,@date,@notes,@createdAt)`);
    for (const c of data.collections || []) {
      insCol.run({ id: c.id, customerId: c.customerId, customerName: c.customerName, amount: c.amount, date: c.date, notes: c.notes || '', createdAt: c.createdAt });
    }

    const insRet = database.prepare(`INSERT INTO returns (id,invoice_id,customer_id,customer_name,items_json,total,total_cost,date,notes,created_at)
      VALUES (@id,@invoiceId,@customerId,@customerName,@itemsJson,@total,@totalCost,@date,@notes,@createdAt)`);
    for (const r of data.returns || []) {
      insRet.run({
        id: r.id, invoiceId: r.invoiceId || '', customerId: r.customerId, customerName: r.customerName,
        itemsJson: JSON.stringify(r.items || []), total: r.total || 0, totalCost: r.totalCost || 0,
        date: r.date, notes: r.notes || '', createdAt: r.createdAt
      });
    }

    const insRec = database.prepare(`INSERT INTO stock_receipts (id,representative_id,representative_name,items_json,total_value,paid_amount,date,notes,created_at)
      VALUES (@id,@representativeId,@representativeName,@itemsJson,@totalValue,@paidAmount,@date,@notes,@createdAt)`);
    for (const s of data.stockReceipts || []) {
      insRec.run({
        id: s.id, representativeId: s.representativeId, representativeName: s.representativeName,
        itemsJson: JSON.stringify(s.items || []), totalValue: s.totalValue || 0, paidAmount: s.paidAmount || 0,
        date: s.date, notes: s.notes || '', createdAt: s.createdAt
      });
    }

    const insRepRet = database.prepare(`INSERT INTO representative_returns (id,representative_id,representative_name,items_json,total_value,date,notes,created_at)
      VALUES (@id,@representativeId,@representativeName,@itemsJson,@totalValue,@date,@notes,@createdAt)`);
    for (const r of data.representativeReturns || []) {
      insRepRet.run({
        id: r.id, representativeId: r.representativeId, representativeName: r.representativeName,
        itemsJson: JSON.stringify(r.items || []), totalValue: r.totalValue || 0,
        date: r.date, notes: r.notes || '', createdAt: r.createdAt
      });
    }

    const insPay = database.prepare(`INSERT INTO payments (id,representative_id,representative_name,amount,date,notes,created_at)
      VALUES (@id,@representativeId,@representativeName,@amount,@date,@notes,@createdAt)`);
    for (const p of data.payments || []) {
      insPay.run({ id: p.id, representativeId: p.representativeId, representativeName: p.representativeName, amount: p.amount, date: p.date, notes: p.notes || '', createdAt: p.createdAt });
    }

    const insMov = database.prepare(`INSERT INTO stock_movements (id,product_id,product_name,type,quantity,reference,date,notes)
      VALUES (@id,@productId,@productName,@type,@quantity,@reference,@date,@notes)`);
    for (const m of (data.stockMovements || []).slice(0, 2000)) {
      insMov.run({
        id: m.id, productId: m.productId, productName: m.productName, type: m.type,
        quantity: m.quantity, reference: m.reference || '', date: m.date, notes: m.notes || ''
      });
    }

    const s = data.settings || {};
    database.prepare(`UPDATE settings SET name=@name, phone=@phone, address=@address, logo=@logo, currency=@currency, profit_password=@profitPassword WHERE id=1`)
      .run({ name: s.name || '', phone: s.phone || '', address: s.address || '', logo: s.logo || '', currency: s.currency || 'ج.م', profitPassword: s.profitPassword || '1234' });

    const lic = data.license || {};
    database.prepare(`UPDATE license SET activated=@activated, type=@type, machine_id=@machineId, expires_at=@expiresAt, activated_at=@activatedAt WHERE id=1`)
      .run({
        activated: lic.activated ? 1 : 0, type: lic.type || 'trial',
        machineId: lic.machineId || '', expiresAt: lic.expiresAt || null, activatedAt: lic.activatedAt || null
      });

    if (data.trialStart) {
      database.prepare("INSERT OR REPLACE INTO meta (key, value) VALUES ('trial_start', ?)").run(data.trialStart);
    }

    const insLayer = database.prepare(`INSERT INTO inventory_layers (id,product_id,quantity,unit_cost,receipt_id,date)
      VALUES (@id,@productId,@quantity,@unitCost,@receiptId,@date)`);
    for (const l of data.inventoryLayers || []) {
      insLayer.run({
        id: l.id, productId: l.productId, quantity: l.quantity, unitCost: l.unitCost,
        receiptId: l.receiptId, date: l.date
      });
    }

    const insAudit = database.prepare(`INSERT INTO audit_logs (id,action,entity,entity_id,details,timestamp) VALUES (@id,@action,@entity,@entityId,@details,@timestamp)`);
    for (const a of (data.auditLogs || []).slice(0, 500)) {
      insAudit.run({ id: a.id, action: a.action, entity: a.entity, entityId: a.entityId || '', details: a.details || '', timestamp: a.timestamp });
    }
  });

  tx();
  return { success: true };
}

function exportJson() {
  return JSON.stringify(loadAllData(), null, 2);
}

function importJson(jsonStr) {
  const data = JSON.parse(jsonStr);
  if (!data.customers || !Array.isArray(data.customers)) {
    return { success: false, message: 'ملف غير صالح' };
  }
  saveAllData(data);
  return {
    success: true,
    message: 'تم الاستيراد بنجاح',
    summary: {
      customers: data.customers?.length || 0,
      products: data.products?.length || 0,
      invoices: data.invoices?.length || 0,
      representatives: data.representatives?.length || 0
    }
  };
}

function closeDb() {
  if (db) {
    db.close();
    db = null;
  }
}

module.exports = {
  initDatabase,
  loadAllData,
  saveAllData,
  exportJson,
  importJson,
  closeDb,
  getDbPath
};
