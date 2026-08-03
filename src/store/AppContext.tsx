import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { AppData } from '../db/storage';
import { loadData, loadDataAsync, saveData, flushToSqlite, addAudit, getTrialDaysLeft, isLicenseValid, getStorageMode } from '../db/storage';
import type {
  Customer, Representative, Product, Invoice, Collection, Return,
  StockReceipt, Payment, RepresentativeReturn, CompanySettings, InventoryLayer
} from '../types';
import { generateId, generateInvoiceNumber } from '../lib/utils';

interface AppContextType {
  data: AppData;
  refresh: () => void;
  // Customers
  addCustomer: (c: Omit<Customer, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateCustomer: (id: string, c: Partial<Customer>) => void;
  deleteCustomer: (id: string) => void;
  // Representatives
  addRepresentative: (r: Omit<Representative, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateRepresentative: (id: string, r: Partial<Representative>) => void;
  deleteRepresentative: (id: string) => void;
  // Products
  addProduct: (p: Omit<Product, 'id' | 'createdAt' | 'updatedAt' | 'currentStock'>) => void;
  updateProduct: (id: string, p: Partial<Product>) => void;
  deleteProduct: (id: string) => void;
  // Invoices
  addInvoice: (inv: Omit<Invoice, 'id' | 'number' | 'createdAt' | 'updatedAt'>, paidAmount?: number) => boolean;
  updateInvoice: (id: string, inv: Partial<Invoice>) => void;
  deleteInvoice: (id: string) => void;
  // Collections
  addCollection: (c: Omit<Collection, 'id' | 'createdAt'>) => void;
  deleteCollection: (id: string) => void;
  // Returns
  addReturn: (r: Omit<Return, 'id' | 'createdAt' | 'totalCost'>) => void;
  deleteReturn: (id: string) => void;
  // Stock Receipts
  addStockReceipt: (s: Omit<StockReceipt, 'id' | 'createdAt' | 'totalValue'> & { paidAmount?: number }) => void;
  deleteStockReceipt: (id: string, options?: { silent?: boolean }) => boolean;
  updateStockReceipt: (id: string, s: Omit<StockReceipt, 'id' | 'createdAt' | 'totalValue'>) => boolean;
  // Payments
  addPayment: (p: Omit<Payment, 'id' | 'createdAt'>) => void;
  deletePayment: (id: string, options?: { silent?: boolean }) => boolean;
  updatePayment: (id: string, p: Omit<Payment, 'id' | 'createdAt'>) => void;
  // Representative Returns (مرتجعات المندوبين)
  addRepresentativeReturn: (r: Omit<RepresentativeReturn, 'id' | 'createdAt'>) => void;
  deleteRepresentativeReturn: (id: string) => void;
  // Settings
  updateSettings: (s: Partial<CompanySettings>) => void;
  // License
  trialDaysLeft: number;
  licenseValid: boolean;
  activateLicense: (code: string, machineId: string) => boolean;
  activateLicenseSecure: (code: string, machineId: string) => Promise<{ ok: boolean; message: string }>;
  // Dark mode
  darkMode: boolean;
  toggleDarkMode: () => void;
}

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<AppData>(loadData());
  const [darkMode, setDarkMode] = useState(() => {
    const v = localStorage.getItem('darkMode');
    return v === null ? true : v === 'true';
  });
  const [trialDaysLeft, setTrialDaysLeft] = useState(getTrialDaysLeft());
  const [licenseValid, setLicenseValid] = useState(isLicenseValid());
  const [storageReady, setStorageReady] = useState(getStorageMode() === 'localStorage');

  // تحميل البيانات من SQLite عند التشغيل في Electron
  useEffect(() => {
    let cancelled = false;
    const finish = (d: typeof data) => {
      if (cancelled) return;
      setData(d);
      setTrialDaysLeft(getTrialDaysLeft());
      setLicenseValid(isLicenseValid());
      setStorageReady(true);
    };

    (async () => {
      try {
        const d = await loadDataAsync();
        finish(d);
      } catch (e) {
        console.error(e);
        finish(loadData());
      }
    })();

    // لا تبقَ الشاشة معلقة أكثر من 5 ثوانٍ
    const forceTimer = setTimeout(() => {
      if (!cancelled) setStorageReady(true);
    }, 5000);

    const onLeave = () => {
      try { flushToSqlite(); } catch { /* ignore */ }
    };
    window.addEventListener('beforeunload', onLeave);
    window.addEventListener('pagehide', onLeave);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') onLeave();
    });

    return () => {
      cancelled = true;
      clearTimeout(forceTimer);
      window.removeEventListener('beforeunload', onLeave);
      window.removeEventListener('pagehide', onLeave);
      onLeave();
    };
  }, []);

  const refresh = useCallback(() => {
    const d = loadData();
    setData(d);
    setTrialDaysLeft(getTrialDaysLeft());
    setLicenseValid(isLicenseValid());
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
    localStorage.setItem('darkMode', String(darkMode));
  }, [darkMode]);

  const persist = (newData: AppData) => {
    saveData(newData);
    setData({ ...newData });
  };

  // Customers
  const addCustomer = (c: Omit<Customer, 'id' | 'createdAt' | 'updatedAt'>) => {
    const now = new Date().toISOString();
    const customer: Customer = { ...c, openingBalance: c.openingBalance ?? 0, id: generateId(), createdAt: now, updatedAt: now };
    const newData = { ...data, customers: [...data.customers, customer] };
    persist(newData);
    addAudit('create', 'customer', customer.id, customer.name);
  };

  const updateCustomer = (id: string, updates: Partial<Customer>) => {
    const newData = {
      ...data,
      customers: data.customers.map(c => c.id === id ? { ...c, ...updates, updatedAt: new Date().toISOString() } : c)
    };
    persist(newData);
    addAudit('update', 'customer', id, updates.name || id);
  };

  const deleteCustomer = (id: string) => {
    const newData = { ...data, customers: data.customers.filter(c => c.id !== id) };
    persist(newData);
    addAudit('delete', 'customer', id, '');
  };

  // Representatives
  const addRepresentative = (r: Omit<Representative, 'id' | 'createdAt' | 'updatedAt'>) => {
    const now = new Date().toISOString();
    const rep: Representative = { ...r, id: generateId(), createdAt: now, updatedAt: now };
    persist({ ...data, representatives: [...data.representatives, rep] });
    addAudit('create', 'representative', rep.id, rep.name);
  };

  const updateRepresentative = (id: string, updates: Partial<Representative>) => {
    persist({
      ...data,
      representatives: data.representatives.map(r => r.id === id ? { ...r, ...updates, updatedAt: new Date().toISOString() } : r)
    });
  };

  const deleteRepresentative = (id: string) => {
    persist({ ...data, representatives: data.representatives.filter(r => r.id !== id) });
  };

  // Products
  const addProduct = (p: Omit<Product, 'id' | 'createdAt' | 'updatedAt' | 'currentStock'>) => {
    const now = new Date().toISOString();
    const product: Product = { ...p, id: generateId(), currentStock: 0, createdAt: now, updatedAt: now };
    persist({ ...data, products: [...data.products, product] });
    addAudit('create', 'product', product.id, product.name);
  };

  const updateProduct = (id: string, updates: Partial<Product>) => {
    persist({
      ...data,
      products: data.products.map(p => p.id === id ? { ...p, ...updates, updatedAt: new Date().toISOString() } : p)
    });
  };

  const deleteProduct = (id: string) => {
    persist({ ...data, products: data.products.filter(p => p.id !== id) });
  };

  // Invoices - FIFO cost layers + منع المخزون السالب
  const addInvoice = (inv: Omit<Invoice, 'id' | 'number' | 'createdAt' | 'updatedAt'>, paidAmount?: number): boolean => {
    for (const item of inv.items) {
      const product = data.products.find(p => p.id === item.productId);
      if (!product) {
        alert('صنف غير موجود: ' + item.productName);
        return false;
      }
      if (product.currentStock < item.quantity) {
        alert(`المخزون غير كافٍ للصنف "${product.name}". المتاح: ${product.currentStock}`);
        return false;
      }
    }

    const now = new Date().toISOString();
    let layers: InventoryLayer[] = [...(data.inventoryLayers || [])];

    // FIFO: خصم من أقدم الطبقات وحساب متوسط التكلفة للبند
    const itemsWithCost = inv.items.map(item => {
      let remaining = item.quantity;
      let costSum = 0;
      // طبقات هذا الصنف مرتبة بالأقدم
      const productLayers = layers
        .filter(l => l.productId === item.productId && l.quantity > 0)
        .sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));

      for (const layer of productLayers) {
        if (remaining <= 0) break;
        const take = Math.min(layer.quantity, remaining);
        costSum += take * layer.unitCost;
        layer.quantity -= take;
        remaining -= take;
      }
      // إن نفدت الطبقات وما زال باقي (بيانات قديمة) استخدم purchasePrice
      if (remaining > 0) {
        const product = data.products.find(p => p.id === item.productId);
        costSum += remaining * (product?.purchasePrice || 0);
      }
      const costAtSale = item.quantity > 0 ? costSum / item.quantity : 0;
      return { ...item, costAtSale };
    });

    // تنظيف الطبقات الفارغة
    layers = layers.filter(l => l.quantity > 0.00001);

    const invoice: Invoice = {
      ...inv,
      items: itemsWithCost,
      id: generateId(),
      number: generateInvoiceNumber(),
      createdAt: now,
      updatedAt: now
    };

    let products = [...data.products];
    const movements = [...(data.stockMovements || [])];

    for (const item of itemsWithCost) {
      products = products.map(p =>
        p.id === item.productId ? { ...p, currentStock: p.currentStock - item.quantity } : p
      );
      movements.push({
        id: generateId(),
        productId: item.productId,
        productName: item.productName,
        type: 'out',
        quantity: item.quantity,
        reference: invoice.number,
        date: inv.date,
        notes: 'بيع'
      });
    }

    const collections = [...(data.collections || [])];
    if (paidAmount && paidAmount > 0) {
      collections.push({
        id: generateId(),
        customerId: inv.customerId,
        customerName: inv.customerName,
        amount: paidAmount,
        date: inv.date,
        notes: 'تحصيل مع فاتورة البيع ' + invoice.number,
        createdAt: now
      });
    }

    persist({
      ...data,
      invoices: [...data.invoices, invoice],
      products,
      stockMovements: movements,
      inventoryLayers: layers,
      collections
    });
    addAudit('create', 'invoice', invoice.id, invoice.number);
    return true;
  };

  const updateInvoice = (id: string, updates: Partial<Invoice>) => {
    const oldInv = data.invoices.find(i => i.id === id);
    if (!oldInv) return;

    // إذا لم تتغير البنود — تحديث بسيط للحقول الأخرى فقط
    if (!updates.items) {
      persist({
        ...data,
        invoices: data.invoices.map(i => i.id === id ? { ...i, ...updates, updatedAt: new Date().toISOString() } : i)
      });
      return;
    }

    const newItems = updates.items.map(item => {
      const product = data.products.find(p => p.id === item.productId);
      return {
        ...item,
        costAtSale: item.costAtSale != null ? item.costAtSale : (product ? product.purchasePrice : 0)
      };
    });

    // محاكاة المخزون: ابدأ من الحالي + أعد كميات الفاتورة القديمة
    const stockMap: Record<string, number> = {};
    for (const p of data.products) stockMap[p.id] = p.currentStock;
    for (const item of oldInv.items) {
      stockMap[item.productId] = (stockMap[item.productId] || 0) + item.quantity;
    }
    // تحقق من الكميات الجديدة
    for (const item of newItems) {
      if ((stockMap[item.productId] || 0) < item.quantity) {
        const product = data.products.find(p => p.id === item.productId);
        alert(`المخزون غير كافٍ بعد التعديل للصنف "${product?.name || item.productName}". المتاح: ${stockMap[item.productId] || 0}`);
        return;
      }
    }

    let products = [...data.products];
    const movements = [...data.stockMovements];
    const today = new Date().toISOString().split('T')[0];

    // 1) إرجاع كميات الفاتورة القديمة
    for (const item of oldInv.items) {
      products = products.map(p => p.id === item.productId
        ? { ...p, currentStock: p.currentStock + item.quantity }
        : p);
      movements.push({
        id: generateId(), productId: item.productId, productName: item.productName,
        type: 'in', quantity: item.quantity, reference: oldInv.number, date: today,
        notes: 'تعديل فاتورة - إرجاع كمية قديمة'
      });
    }

    // 2) خصم الكميات الجديدة
    for (const item of newItems) {
      products = products.map(p => p.id === item.productId
        ? { ...p, currentStock: p.currentStock - item.quantity }
        : p);
      movements.push({
        id: generateId(), productId: item.productId, productName: item.productName,
        type: 'out', quantity: item.quantity, reference: oldInv.number, date: today,
        notes: 'تعديل فاتورة - كمية جديدة'
      });
    }

    const subtotal = newItems.reduce((s, i) => s + i.total, 0);
    const discount = updates.discount != null ? updates.discount : oldInv.discount;
    const total = Math.max(0, subtotal - discount);

    persist({
      ...data,
      products,
      stockMovements: movements,
      invoices: data.invoices.map(i => i.id === id ? {
        ...i,
        ...updates,
        items: newItems,
        subtotal,
        discount,
        total,
        updatedAt: new Date().toISOString()
      } : i)
    });
    addAudit('update', 'invoice', id, oldInv.number);
  };

  const deleteInvoice = (id: string) => {
    const invoice = data.invoices.find(i => i.id === id);
    if (!invoice) return;
    if (!confirm('⚠️ حذف الفاتورة\n\nسيتم إعادة كميات الأصناف إلى المخزون وحذف الحركة المرتبطة.\nهل أنت متأكد؟')) return;

    let products = [...data.products];
    const movements = [...data.stockMovements];

    for (const item of invoice.items) {
      products = products.map(p => {
        if (p.id === item.productId) {
          return { ...p, currentStock: p.currentStock + item.quantity };
        }
        return p;
      });
      movements.push({
        id: generateId(),
        productId: item.productId,
        productName: item.productName,
        type: 'in',
        quantity: item.quantity,
        reference: invoice.number,
        date: new Date().toISOString().split('T')[0],
        notes: 'إلغاء فاتورة - إعادة مخزون'
      });
    }

    // إزالة حركات المخزون المرتبطة برقم الفاتورة + إضافة حركة الإلغاء
    const cleanedMovements = movements.filter(m => m.reference !== invoice.number);

    persist({
      ...data,
      invoices: data.invoices.filter(i => i.id !== id),
      products,
      stockMovements: cleanedMovements
    });
    addAudit('delete', 'invoice', id, invoice.number);
  };

  // Collections
  const addCollection = (c: Omit<Collection, 'id' | 'createdAt'>) => {
    const collection: Collection = { ...c, id: generateId(), createdAt: new Date().toISOString() };
    persist({ ...data, collections: [...data.collections, collection] });
    addAudit('create', 'collection', collection.id, String(c.amount));
  };

  const deleteCollection = (id: string) => {
    if (!confirm('⚠️ حذف التحصيل\n\nسيُعاد احتساب رصيد العميل.\nهل أنت متأكد؟')) return;
    persist({ ...data, collections: data.collections.filter(c => c.id !== id) });
    addAudit('delete', 'collection', id, '');
  };

  // Returns - restore stock + تكلفة من الفاتورة الأصلية (ليس سعر اليوم)
  const addReturn = (r: Omit<Return, 'id' | 'createdAt' | 'totalCost'>) => {
    const invoice = r.invoiceId ? data.invoices.find(i => i.id === r.invoiceId) : null;

    // تسعير البنود من الفاتورة الأصلية إن وُجدت
    const pricedItems = r.items.map(item => {
      const invItem = invoice?.items.find(ii => ii.productId === item.productId);
      const unitPrice = invItem ? invItem.unitPrice : item.unitPrice;
      const costAtSale = invItem?.costAtSale != null
        ? invItem.costAtSale
        : (item.costAtSale != null ? item.costAtSale : (data.products.find(p => p.id === item.productId)?.purchasePrice || 0));
      return {
        ...item,
        unitPrice,
        total: unitPrice * item.quantity,
        costAtSale
      };
    });
    const total = pricedItems.reduce((s, i) => s + i.total, 0);
    const totalCost = pricedItems.reduce((s, i) => s + (i.costAtSale || 0) * i.quantity, 0);

    const ret: Return = {
      ...r,
      items: pricedItems,
      total,
      totalCost,
      id: generateId(),
      createdAt: new Date().toISOString()
    };

    let products = [...data.products];
    const movements = [...data.stockMovements];

    for (const item of pricedItems) {
      products = products.map(p => {
        if (p.id === item.productId) {
          return { ...p, currentStock: p.currentStock + item.quantity };
        }
        return p;
      });
      movements.push({
        id: generateId(),
        productId: item.productId,
        productName: item.productName,
        type: 'return_in',
        quantity: item.quantity,
        reference: ret.id,
        date: r.date,
        notes: 'مرتجع بيع'
      });
    }

    persist({
      ...data,
      returns: [...data.returns, ret],
      products,
      stockMovements: movements
    });
  };

  const deleteReturn = (id: string) => {
    const ret = data.returns.find(r => r.id === id);
    if (!ret) return;
    if (!confirm('حذف المرتجع سيخصم الكميات من المخزون مرة أخرى. هل أنت متأكد؟')) return;

    let products = [...data.products];
    const movements = [...data.stockMovements];

    // خصم فعلي بدون Math.max — لإظهار أي عدم اتساق في المخزون
    for (const item of ret.items) {
      products = products.map(p => {
        if (p.id === item.productId) {
          return { ...p, currentStock: p.currentStock - item.quantity };
        }
        return p;
      });
      movements.push({
        id: generateId(),
        productId: item.productId,
        productName: item.productName,
        type: 'out',
        quantity: item.quantity,
        reference: ret.id,
        date: new Date().toISOString().split('T')[0],
        notes: 'إلغاء مرتجع عميل'
      });
    }

    const cleanedMovements = movements.filter(m => m.reference !== ret.id);

    persist({
      ...data,
      returns: data.returns.filter(r => r.id !== id),
      products,
      stockMovements: cleanedMovements
    });
    addAudit('delete', 'return', id, ret.customerName);
  };

  // استلام بضاعة + طبقات FIFO + مبلغ مسدد اختياري
  const addStockReceipt = (s: Omit<StockReceipt, 'id' | 'createdAt' | 'totalValue'>) => {
    const itemsWithCost = s.items.map(item => {
      const unitCost = item.unitCost != null ? Number(item.unitCost) : 0;
      return {
        productId: item.productId,
        productName: item.productName,
        quantity: item.quantity,
        unitCost
      };
    });
    const totalValue = itemsWithCost.reduce((sum, i) => sum + i.quantity * i.unitCost, 0);
    const paidAmount = Number((s as any).paidAmount) || 0;
    const receipt: StockReceipt = {
      ...s,
      items: itemsWithCost,
      totalValue,
      paidAmount,
      id: generateId(),
      createdAt: new Date().toISOString()
    };

    let products = [...data.products];
    const movements = [...(data.stockMovements || [])];
    const layers = [...(data.inventoryLayers || [])];
    let payments = [...(data.payments || [])];

    for (const item of itemsWithCost) {
      products = products.map(p => {
        if (p.id === item.productId) {
          return {
            ...p,
            currentStock: p.currentStock + item.quantity,
            purchasePrice: item.unitCost // آخر سعر شراء للعرض
          };
        }
        return p;
      });
      layers.push({
        id: generateId(),
        productId: item.productId,
        quantity: item.quantity,
        unitCost: item.unitCost,
        receiptId: receipt.id,
        date: s.date
      });
      movements.push({
        id: generateId(),
        productId: item.productId,
        productName: item.productName,
        type: 'in',
        quantity: item.quantity,
        reference: receipt.id,
        date: s.date,
        notes: 'شراء/استلام من مندوب'
      });
    }

    // دفعة مربوطة بنفس الفاتورة إن وُجد مبلغ مسدد
    if (paidAmount > 0) {
      payments.push({
        id: generateId(),
        representativeId: s.representativeId,
        representativeName: s.representativeName,
        amount: paidAmount,
        date: s.date,
        notes: 'سداد مع فاتورة استلام ' + receipt.id.slice(0, 8),
        createdAt: new Date().toISOString()
      });
    }

    persist({
      ...data,
      stockReceipts: [...data.stockReceipts, receipt],
      products,
      stockMovements: movements,
      inventoryLayers: layers,
      payments
    });
    addAudit('create', 'stockReceipt', receipt.id, s.representativeName);
  };

  // Payments
  // Payments
  const addPayment = (p: Omit<Payment, 'id' | 'createdAt'>) => {
    const payment: Payment = { ...p, id: generateId(), createdAt: new Date().toISOString() };
    persist({ ...data, payments: [...data.payments, payment] });
    addAudit('create', 'payment', payment.id, String(p.amount));
  };

  const deletePayment = (id: string, options?: { silent?: boolean }): boolean => {
    if (!options?.silent && !confirm('⚠️ حذف دفعة المندوب\n\nسيُعاد احتساب رصيد المندوب.\nهل أنت متأكد؟')) return false;
    persist({ ...data, payments: data.payments.filter(p => p.id !== id) });
    addAudit('delete', 'payment', id, '');
    return true;
  };

  const deleteStockReceipt = (id: string, options?: { silent?: boolean }): boolean => {
    const receipt = (data.stockReceipts || []).find(r => r.id === id);
    if (!receipt) return false;
    if (!options?.silent && !confirm('⚠️ حذف استلام بضاعة\n\nسيتم خصم الكميات من المخزون وتعديل رصيد المندوب.\nهل أنت متأكد؟')) return false;

    for (const item of receipt.items) {
      const product = data.products.find(p => p.id === item.productId);
      if (product && product.currentStock < item.quantity) {
        alert(`لا يمكن الحذف: مخزون "${product.name}" غير كافٍ (المتاح ${product.currentStock}).`);
        return false;
      }
    }

    let products = [...data.products];
    let movements = [...(data.stockMovements || [])].filter(m => m.reference !== receipt.id);
    let layers = [...(data.inventoryLayers || [])].filter(l => l.receiptId !== receipt.id);
    let payments = [...(data.payments || [])];

    for (const item of receipt.items) {
      products = products.map(p =>
        p.id === item.productId
          ? { ...p, currentStock: p.currentStock - item.quantity }
          : p
      );
      movements.push({
        id: generateId(),
        productId: item.productId,
        productName: item.productName,
        type: 'out',
        quantity: item.quantity,
        reference: receipt.id,
        date: new Date().toISOString().split('T')[0],
        notes: 'إلغاء استلام من مندوب'
      });
    }

    // إزالة دفعة مرتبطة بنفس المرجع إن وُجدت
    if (receipt.paidAmount && receipt.paidAmount > 0) {
      payments = payments.filter(p => !(p.representativeId === receipt.representativeId && (p.notes || '').includes(receipt.id.slice(0, 8))));
    }

    persist({
      ...data,
      stockReceipts: data.stockReceipts.filter(r => r.id !== id),
      products,
      stockMovements: movements,
      inventoryLayers: layers,
      payments
    });
    addAudit('delete', 'stockReceipt', id, receipt.representativeName);
    return true;
  };

  /** تعديل استلام: عكس القديم + تطبيق الجديد في عملية واحدة */
  const updateStockReceipt = (id: string, s: Omit<StockReceipt, 'id' | 'createdAt' | 'totalValue'>): boolean => {
    const old = (data.stockReceipts || []).find(r => r.id === id);
    if (!old) return false;

    // محاكاة المخزون بعد إزالة الاستلام القديم
    const stockMap: Record<string, number> = {};
    for (const p of data.products) stockMap[p.id] = p.currentStock;
    for (const item of old.items) {
      stockMap[item.productId] = (stockMap[item.productId] || 0) - item.quantity;
    }
    // بعد إضافة الجديد
    const itemsWithCost = s.items.map(item => {
      const product = data.products.find(p => p.id === item.productId);
      const unitCost = (item as any).unitCost != null
        ? (item as any).unitCost
        : (product ? product.purchasePrice : 0);
      return { productId: item.productId, productName: item.productName, quantity: item.quantity, unitCost };
    });
    const totalValue = itemsWithCost.reduce((sum, i) => sum + i.quantity * i.unitCost, 0);

    let products = [...data.products];
    // reverse old
    for (const item of old.items) {
      const p = products.find(x => x.id === item.productId);
      if (p && p.currentStock < item.quantity) {
        alert(`لا يمكن التعديل: مخزون "${p.name}" غير كافٍ لإلغاء الاستلام السابق.`);
        return false;
      }
      products = products.map(p => p.id === item.productId ? { ...p, currentStock: p.currentStock - item.quantity } : p);
    }
    // apply new
    for (const item of itemsWithCost) {
      products = products.map(p => p.id === item.productId ? { ...p, currentStock: p.currentStock + item.quantity } : p);
    }

    const newReceipt = {
      ...s,
      items: itemsWithCost,
      totalValue,
      id: old.id,
      createdAt: old.createdAt
    };

    let movements = [...(data.stockMovements || [])].filter(m => m.reference !== old.id);
    const today = new Date().toISOString().split('T')[0];
    for (const item of old.items) {
      movements.push({
        id: generateId(), productId: item.productId, productName: item.productName,
        type: 'out', quantity: item.quantity, reference: old.id, date: today,
        notes: 'تعديل استلام - إلغاء قديم'
      });
    }
    for (const item of itemsWithCost) {
      movements.push({
        id: generateId(), productId: item.productId, productName: item.productName,
        type: 'in', quantity: item.quantity, reference: old.id, date: s.date,
        notes: 'تعديل استلام - كمية جديدة'
      });
    }

    persist({
      ...data,
      stockReceipts: data.stockReceipts.map(r => r.id === id ? newReceipt : r),
      products,
      stockMovements: movements
    });
    addAudit('update', 'stockReceipt', id, s.representativeName);
    return true;
  };

  const updatePayment = (id: string, p: Omit<Payment, 'id' | 'createdAt'>) => {
    persist({
      ...data,
      payments: data.payments.map(x => x.id === id ? { ...x, ...p } : x)
    });
    addAudit('update', 'payment', id, String(p.amount));
  };

  // Representative Returns (مرتجعات المندوبين) - يخصم من رصيد المندوب ويخصم من المخزون
  const addRepresentativeReturn = (r: Omit<RepresentativeReturn, 'id' | 'createdAt'>) => {
    // منع الوصول لمخزون سالب
    for (const item of r.items) {
      const product = data.products.find(p => p.id === item.productId);
      if (!product) {
        alert('صنف غير موجود: ' + item.productName);
        return;
      }
      if (product.currentStock < item.quantity) {
        alert(`المخزون غير كافٍ للصنف "${product.name}". المتاح: ${product.currentStock}`);
        return;
      }
    }

    const ret: RepresentativeReturn = { ...r, id: generateId(), createdAt: new Date().toISOString() };
    let products = [...data.products];
    const movements = [...(data.stockMovements || [])];
    const repReturns = [...(data.representativeReturns || [])];

    for (const item of r.items) {
      products = products.map(p => {
        if (p.id === item.productId) {
          return { ...p, currentStock: p.currentStock - item.quantity };
        }
        return p;
      });
      movements.push({
        id: generateId(),
        productId: item.productId,
        productName: item.productName,
        type: 'return_out' as const,
        quantity: item.quantity,
        reference: ret.id,
        date: r.date,
        notes: 'مرتجع إلى مندوب: ' + r.representativeName
      });
    }

    persist({
      ...data,
      representativeReturns: [...repReturns, ret],
      products,
      stockMovements: movements
    });
    addAudit('create', 'representativeReturn', ret.id, r.representativeName);
  };

  const deleteRepresentativeReturn = (id: string) => {
    const ret = (data.representativeReturns || []).find(r => r.id === id);
    if (!ret) return;
    if (!confirm('حذف مرتجع المندوب سيعيد الكميات إلى المخزون. هل أنت متأكد؟')) return;

    let products = [...data.products];
    const movements = [...(data.stockMovements || [])];

    for (const item of ret.items) {
      products = products.map(p => {
        if (p.id === item.productId) {
          return { ...p, currentStock: p.currentStock + item.quantity };
        }
        return p;
      });
      movements.push({
        id: generateId(),
        productId: item.productId,
        productName: item.productName,
        type: 'in' as const,
        quantity: item.quantity,
        reference: ret.id,
        date: new Date().toISOString().split('T')[0],
        notes: 'إلغاء مرتجع مندوب - إعادة مخزون'
      });
    }

    persist({
      ...data,
      representativeReturns: (data.representativeReturns || []).filter(r => r.id !== id),
      products,
      stockMovements: movements
    });
    addAudit('delete', 'representativeReturn', id, ret.representativeName);
  };

  // Settings
  const updateSettings = (s: Partial<CompanySettings>) => {
    persist({ ...data, settings: { ...data.settings, ...s } });
  };

  // License sync stub — التفعيل الحقيقي عبر activateLicenseSecure (HMAC في Electron)
  const activateLicense = (_code: string, _machineId: string): boolean => {
    return false;
  };

  /** تفعيل قوي عبر Electron (HMAC) — يُفضّل استدعاؤه من الإعدادات */
  const activateLicenseSecure = async (code: string, machineId: string): Promise<{ ok: boolean; message: string }> => {
    if (typeof window !== 'undefined' && (window as any).electronAPI?.licenseValidate) {
      const result = await (window as any).electronAPI.licenseValidate(code, machineId);
      if (result.valid) {
        persist({
          ...data,
          license: {
            activated: true,
            type: (result.type === 'yearly' ? 'yearly' : 'permanent') as 'permanent' | 'yearly',
            machineId,
            activatedAt: new Date().toISOString(),
            expiresAt: result.expiresAt
          }
        });
        setLicenseValid(true);
        return { ok: true, message: result.message };
      }
      return { ok: false, message: result.message || 'كود غير صالح' };
    }
    // Fallback
    const ok = activateLicense(code, machineId);
    return { ok, message: ok ? 'تم التفعيل' : 'كود غير صالح' };
  };

  const toggleDarkMode = () => setDarkMode(d => !d);

  return (
    <AppContext.Provider value={{
      data, refresh,
      addCustomer, updateCustomer, deleteCustomer,
      addRepresentative, updateRepresentative, deleteRepresentative,
      addProduct, updateProduct, deleteProduct,
      addInvoice, updateInvoice, deleteInvoice,
      addCollection, deleteCollection,
      addReturn, deleteReturn,
      addStockReceipt, deleteStockReceipt, updateStockReceipt, addPayment, deletePayment, updatePayment,
      addRepresentativeReturn, deleteRepresentativeReturn,
      updateSettings,
      trialDaysLeft, licenseValid, activateLicense, activateLicenseSecure,
      storageReady, storageMode,
      darkMode, toggleDarkMode
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
