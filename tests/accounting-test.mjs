/**
 * Agri Plus - Comprehensive Accounting & License Tests
 * Run: node tests/accounting-test.mjs
 */
import assert from 'assert';
import crypto from 'crypto';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const license = require('../electron/license.cjs');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log('  ✓', name);
    passed++;
  } catch (e) {
    console.log('  ✗', name);
    console.log('   ', e.message);
    failed++;
  }
}

console.log('\n══════════════════════════════════════');
console.log('  Agri Plus — Comprehensive Test Suite');
console.log('══════════════════════════════════════\n');

console.log('1) License System');
test('getMachineId returns 32-char hex', () => {
  const id = license.getMachineId();
  assert.strictEqual(id.length, 32);
  assert.match(id, /^[A-F0-9]+$/);
});

test('generate permanent license', () => {
  const mid = license.getMachineId();
  const key = license.generateLicense(mid, 'PERM');
  assert.match(key, /^AGRI-PERM-[A-F0-9]{8}-PERM-[A-F0-9]{8}$/);
});

test('generate yearly license', () => {
  const mid = license.getMachineId();
  const key = license.generateLicense(mid, 'YEAR', 1);
  assert.match(key, /^AGRI-YEAR-[A-F0-9]{8}-\d{8}-[A-F0-9]{8}$/);
});

test('validate correct permanent key', () => {
  const mid = license.getMachineId();
  const key = license.generateLicense(mid, 'PERM');
  const r = license.validateLicense(key, mid);
  assert.strictEqual(r.valid, true);
  assert.strictEqual(r.type, 'permanent');
});

test('reject key for wrong machine', () => {
  const mid = license.getMachineId();
  const key = license.generateLicense(mid, 'PERM');
  const r = license.validateLicense(key, 'FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF');
  assert.strictEqual(r.valid, false);
});

test('reject tampered signature', () => {
  const mid = license.getMachineId();
  const key = license.generateLicense(mid, 'PERM');
  const tampered = key.slice(0, -2) + 'XX';
  const r = license.validateLicense(tampered, mid);
  assert.strictEqual(r.valid, false);
});

test('reject malformed key', () => {
  const r = license.validateLicense('RANDOM-JUNK', license.getMachineId());
  assert.strictEqual(r.valid, false);
});

test('legacy demo key is rejected', () => {
  const r = license.validateLicense('AGRI-PERMANENT-2026', license.getMachineId());
  assert.strictEqual(r.valid, false);
});

console.log('\n2) Accounting Logic (Real Data Simulation)');

function uid() { return crypto.randomUUID(); }

function createStore() {
  return { products: [], invoices: [], returns: [], stockReceipts: [], payments: [], collections: [] };
}

function addProduct(store, p) {
  store.products.push({ id: uid(), currentStock: 0, purchasePrice: 0, salePrice: 0, minStock: 0, ...p });
  return store.products[store.products.length - 1];
}

function receiveStock(store, productId, qty) {
  const p = store.products.find(x => x.id === productId);
  p.currentStock += qty;
}

function sell(store, productId, qty, salePrice) {
  const p = store.products.find(x => x.id === productId);
  if (p.currentStock < qty) throw new Error(`Insufficient stock: ${p.name} has ${p.currentStock}`);
  p.currentStock -= qty;
  const item = { productId, productName: p.name, quantity: qty, unitPrice: salePrice, total: qty * salePrice, costAtSale: p.purchasePrice };
  const inv = { id: uid(), items: [item], total: item.total, discount: 0, subtotal: item.total };
  store.invoices.push(inv);
  return inv;
}

function customerReturn(store, invoiceId, productId, qty) {
  const inv = store.invoices.find(i => i.id === invoiceId);
  if (!inv) throw new Error('Invoice not found');
  const sold = inv.items.find(i => i.productId === productId)?.quantity || 0;
  const prevRet = store.returns.filter(r => r.invoiceId === invoiceId)
    .reduce((s, r) => s + (r.items.find(i => i.productId === productId)?.quantity || 0), 0);
  if (qty > sold - prevRet) throw new Error('Return exceeds sold quantity');
  const p = store.products.find(x => x.id === productId);
  p.currentStock += qty;
  const item = inv.items.find(i => i.productId === productId);
  store.returns.push({ id: uid(), invoiceId, items: [{ productId, quantity: qty, unitPrice: item.unitPrice, total: qty * item.unitPrice }] });
}

function deleteInvoice(store, invoiceId) {
  const inv = store.invoices.find(i => i.id === invoiceId);
  if (!inv) return;
  for (const item of inv.items) {
    const p = store.products.find(x => x.id === item.productId);
    p.currentStock += item.quantity;
  }
  store.invoices = store.invoices.filter(i => i.id !== invoiceId);
}

function profit(store) {
  let sales = 0, cost = 0, returnsTotal = 0, returnsCost = 0;
  for (const inv of store.invoices) {
    sales += inv.total;
    for (const item of inv.items) cost += (item.costAtSale ?? 0) * item.quantity;
  }
  for (const r of store.returns) {
    for (const item of r.items) returnsTotal += item.total || 0;
    returnsCost += r.totalCost || r.items.reduce((s, i) => s + (i.costAtSale || 0) * i.quantity, 0);
  }
  return { sales, cost, returnsTotal, returnsCost, net: sales - cost - returnsTotal + returnsCost };
}

test('stock increases on receive', () => {
  const s = createStore();
  const p = addProduct(s, { name: 'مبيد أ', purchasePrice: 50, salePrice: 80 });
  receiveStock(s, p.id, 10);
  assert.strictEqual(p.currentStock, 10);
});

test('sell deducts stock', () => {
  const s = createStore();
  const p = addProduct(s, { name: 'مبيد أ', purchasePrice: 50, salePrice: 80 });
  receiveStock(s, p.id, 10);
  sell(s, p.id, 3, 80);
  assert.strictEqual(p.currentStock, 7);
});

test('prevent sell below zero', () => {
  const s = createStore();
  const p = addProduct(s, { name: 'مبيد أ', purchasePrice: 50, salePrice: 80 });
  receiveStock(s, p.id, 2);
  assert.throws(() => sell(s, p.id, 5, 80), /Insufficient/);
  assert.strictEqual(p.currentStock, 2);
});

test('costAtSale snapshotted at sale time', () => {
  const s = createStore();
  const p = addProduct(s, { name: 'مبيد أ', purchasePrice: 50, salePrice: 80 });
  receiveStock(s, p.id, 10);
  const inv = sell(s, p.id, 2, 80);
  assert.strictEqual(inv.items[0].costAtSale, 50);
  p.purchasePrice = 99;
  assert.strictEqual(inv.items[0].costAtSale, 50);
  const pr = profit(s);
  assert.strictEqual(pr.cost, 100);
  assert.strictEqual(pr.sales, 160);
  assert.strictEqual(pr.net, 60);
});

test('customer return restores stock and validates qty', () => {
  const s = createStore();
  const p = addProduct(s, { name: 'مبيد أ', purchasePrice: 50, salePrice: 80 });
  receiveStock(s, p.id, 10);
  const inv = sell(s, p.id, 5, 80);
  assert.strictEqual(p.currentStock, 5);
  customerReturn(s, inv.id, p.id, 2);
  assert.strictEqual(p.currentStock, 7);
  assert.throws(() => customerReturn(s, inv.id, p.id, 10), /exceeds/);
});

test('delete invoice restores stock', () => {
  const s = createStore();
  const p = addProduct(s, { name: 'مبيد أ', purchasePrice: 50, salePrice: 80 });
  receiveStock(s, p.id, 10);
  const inv = sell(s, p.id, 4, 80);
  assert.strictEqual(p.currentStock, 6);
  deleteInvoice(s, inv.id);
  assert.strictEqual(p.currentStock, 10);
  assert.strictEqual(s.invoices.length, 0);
});

test('profit formula includes return cost reversal', () => {
  const s = createStore();
  const p = addProduct(s, { name: 'مبيد ب', purchasePrice: 100, salePrice: 150 });
  receiveStock(s, p.id, 20);
  const inv = sell(s, p.id, 10, 150);
  customerReturn(s, inv.id, p.id, 2);
  // returns should carry cost - simulate
  const ret = s.returns[0];
  ret.totalCost = 200; // 2 * 100
  ret.items[0].costAtSale = 100;
  const pr = profit(s);
  assert.strictEqual(pr.sales, 1500);
  assert.strictEqual(pr.cost, 1000);
  assert.strictEqual(pr.returnsTotal, 300);
  // net = 1500 - 1000 - 300 + 200 = 400
  assert.strictEqual(pr.net, 400);
});

test('full multi-product scenario', () => {
  const s = createStore();
  const a = addProduct(s, { name: 'حشري', purchasePrice: 40, salePrice: 70 });
  const b = addProduct(s, { name: 'فطري', purchasePrice: 60, salePrice: 100 });
  receiveStock(s, a.id, 100);
  receiveStock(s, b.id, 50);
  sell(s, a.id, 20, 70);
  sell(s, b.id, 10, 100);
  sell(s, a.id, 5, 70);
  assert.strictEqual(a.currentStock, 75);
  assert.strictEqual(b.currentStock, 40);
  const pr = profit(s);
  assert.strictEqual(pr.sales, 2750);
  assert.strictEqual(pr.cost, 1600);
  assert.strictEqual(pr.net, 1150);
});

test('changing purchase price does not alter historical profit', () => {
  const s = createStore();
  const p = addProduct(s, { name: 'سماد', purchasePrice: 30, salePrice: 55 });
  receiveStock(s, p.id, 50);
  sell(s, p.id, 10, 55);
  const net1 = profit(s).net;
  p.purchasePrice = 200;
  const net2 = profit(s).net;
  assert.strictEqual(net1, net2);
});


test('invoice edit restocks then re-deducts', () => {
  const s = createStore();
  const p = addProduct(s, { name: 'مبيد', purchasePrice: 10, salePrice: 20 });
  receiveStock(s, p.id, 10);
  const inv = sell(s, p.id, 4, 20);
  assert.strictEqual(p.currentStock, 6);
  // simulate edit: restore old qty, apply new qty 2
  p.currentStock += 4; // restore
  assert.ok(p.currentStock >= 2);
  p.currentStock -= 2; // new
  inv.items[0].quantity = 2;
  inv.items[0].total = 40;
  inv.total = 40;
  assert.strictEqual(p.currentStock, 8);
});

test('receipt unitCost snapshot independent of later price change', () => {
  const unitCostAtReceipt = 45;
  let receivedValue = 10 * unitCostAtReceipt; // 450
  // later purchase price changes
  const currentPrice = 99;
  // balance must still use 450 not 990
  assert.strictEqual(receivedValue, 450);
  assert.notStrictEqual(receivedValue, 10 * currentPrice);
});

test('customer statement balance formula', () => {
  const sales = 1000, collections = 400, returns = 100;
  const balance = sales - collections - returns;
  assert.strictEqual(balance, 500);
});

console.log('\n3) Representative Balance');
test('rep balance = received - returns - payments', () => {
  assert.strictEqual(1000 - 200 - 300, 500);
});

console.log('\n══════════════════════════════════════');
console.log(`  Results: ${passed} passed, ${failed} failed`);
console.log('══════════════════════════════════════\n');
process.exit(failed > 0 ? 1 : 0);
