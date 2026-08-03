/**
 * Drizzle ORM Schema — مطابق لجداول SQLite في electron/db.cjs
 */
import { sqliteTable, text, real, integer } from 'drizzle-orm/sqlite-core';

export const meta = sqliteTable('meta', {
  key: text('key').primaryKey(),
  value: text('value').notNull()
});

export const customers = sqliteTable('customers', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  phone: text('phone').default(''),
  address: text('address').default(''),
  region: text('region').default(''),
  notes: text('notes').default(''),
  status: text('status').default('active'),
  representativeId: text('representative_id'),
  openingBalance: real('opening_balance').default(0),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull()
});

export const representatives = sqliteTable('representatives', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  phone: text('phone').default(''),
  region: text('region').default(''),
  notes: text('notes').default(''),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull()
});

export const products = sqliteTable('products', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  tradeName: text('trade_name').default(''),
  activeIngredient: text('active_ingredient').default(''),
  concentration: text('concentration').default(''),
  company: text('company').default(''),
  unit: text('unit').default('عبوة'),
  purchasePrice: real('purchase_price').default(0),
  salePrice: real('sale_price').default(0),
  minStock: real('min_stock').default(0),
  currentStock: real('current_stock').default(0),
  category: text('category').default('insecticide'),
  notes: text('notes').default(''),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull()
});

export const invoices = sqliteTable('invoices', {
  id: text('id').primaryKey(),
  number: text('number').notNull(),
  customerId: text('customer_id').notNull(),
  customerName: text('customer_name').notNull(),
  itemsJson: text('items_json').notNull(),
  subtotal: real('subtotal').default(0),
  discount: real('discount').default(0),
  total: real('total').default(0),
  notes: text('notes').default(''),
  date: text('date').notNull(),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull()
});

export const collections = sqliteTable('collections', {
  id: text('id').primaryKey(),
  customerId: text('customer_id').notNull(),
  customerName: text('customer_name').notNull(),
  amount: real('amount').notNull(),
  date: text('date').notNull(),
  notes: text('notes').default(''),
  createdAt: text('created_at').notNull()
});

export const returns = sqliteTable('returns', {
  id: text('id').primaryKey(),
  invoiceId: text('invoice_id').default(''),
  customerId: text('customer_id').notNull(),
  customerName: text('customer_name').notNull(),
  itemsJson: text('items_json').notNull(),
  total: real('total').default(0),
  totalCost: real('total_cost').default(0),
  date: text('date').notNull(),
  notes: text('notes').default(''),
  createdAt: text('created_at').notNull()
});

export const stockReceipts = sqliteTable('stock_receipts', {
  id: text('id').primaryKey(),
  representativeId: text('representative_id').notNull(),
  representativeName: text('representative_name').notNull(),
  itemsJson: text('items_json').notNull(),
  totalValue: real('total_value').default(0),
  paidAmount: real('paid_amount').default(0),
  date: text('date').notNull(),
  notes: text('notes').default(''),
  createdAt: text('created_at').notNull()
});

export const representativeReturns = sqliteTable('representative_returns', {
  id: text('id').primaryKey(),
  representativeId: text('representative_id').notNull(),
  representativeName: text('representative_name').notNull(),
  itemsJson: text('items_json').notNull(),
  totalValue: real('total_value').default(0),
  date: text('date').notNull(),
  notes: text('notes').default(''),
  createdAt: text('created_at').notNull()
});

export const payments = sqliteTable('payments', {
  id: text('id').primaryKey(),
  representativeId: text('representative_id').notNull(),
  representativeName: text('representative_name').notNull(),
  amount: real('amount').notNull(),
  date: text('date').notNull(),
  notes: text('notes').default(''),
  createdAt: text('created_at').notNull()
});

export const stockMovements = sqliteTable('stock_movements', {
  id: text('id').primaryKey(),
  productId: text('product_id').notNull(),
  productName: text('product_name').notNull(),
  type: text('type').notNull(),
  quantity: real('quantity').notNull(),
  reference: text('reference').default(''),
  date: text('date').notNull(),
  notes: text('notes').default('')
});

export const settings = sqliteTable('settings', {
  id: integer('id').primaryKey(),
  name: text('name').default(''),
  phone: text('phone').default(''),
  address: text('address').default(''),
  logo: text('logo').default(''),
  currency: text('currency').default('ج.م'),
  profitPassword: text('profit_password').default('1234')
});

export const license = sqliteTable('license', {
  id: integer('id').primaryKey(),
  activated: integer('activated').default(0),
  type: text('type').default('trial'),
  machineId: text('machine_id').default(''),
  expiresAt: text('expires_at'),
  activatedAt: text('activated_at')
});

export const auditLogs = sqliteTable('audit_logs', {
  id: text('id').primaryKey(),
  action: text('action').notNull(),
  entity: text('entity').notNull(),
  entityId: text('entity_id').default(''),
  details: text('details').default(''),
  timestamp: text('timestamp').notNull()
});
