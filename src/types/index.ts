export interface Customer {
  id: string;
  name: string;
  phone: string;
  address: string;
  region: string;
  notes: string;
  status: 'active' | 'inactive';
  representativeId?: string;
  /** رصيد افتتاحي / مديونية تاريخية (موجب = على العميل) */
  openingBalance: number;
  createdAt: string;
  updatedAt: string;
}

export interface Representative {
  id: string;
  name: string;
  phone: string;
  company: string; // اسم الشركة
  region: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export type ProductCategory =
  | 'insecticide'
  | 'fungicide'
  | 'herbicide'
  | 'fertilizer'
  | 'growth_regulator'
  | 'micronutrients'
  | 'foliar_nutrition';

export interface Product {
  id: string;
  name: string;
  tradeName: string;
  activeIngredient: string;
  concentration: string;
  company: string;
  unit: string;
  purchasePrice: number;
  salePrice: number;
  minStock: number;
  currentStock: number;
  category: ProductCategory;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface InvoiceItem {
  costAtSale?: number; // تكلفة الشراء وقت البيع (للأرباح الدقيقة)
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface Invoice {
  id: string;
  number: string;
  customerId: string;
  customerName: string;
  items: InvoiceItem[];
  subtotal: number;
  discount: number;
  total: number;
  notes: string;
  date: string;
  createdAt: string;
  updatedAt: string;
}

export interface Collection {
  id: string;
  customerId: string;
  customerName: string;
  amount: number;
  date: string;
  notes: string;
  createdAt: string;
}

export interface Return {
  id: string;
  invoiceId: string;
  customerId: string;
  customerName: string;
  /** بنود بأسعار الفاتورة الأصلية + costAtSale للربح الدقيق */
  items: InvoiceItem[];
  total: number;
  /** تكلفة الوحدات المرتجعة (مجموع costAtSale * qty) */
  totalCost: number;
  /** المبلغ الذي دُفع فعلياً نقداً للعميل عند هذا المرتجع (اختياري) */
  refundAmount?: number;
  date: string;
  notes: string;
  createdAt: string;
}

/** طبقة مخزون بسعر شراء محدد (FIFO للأرباح) */
export interface InventoryLayer {
  id: string;
  productId: string;
  quantity: number; // المتبقي من الطبقة
  unitCost: number;
  receiptId: string;
  date: string;
}

export interface StockReceiptItem {
  productId: string;
  productName: string;
  quantity: number;
  unitCost: number; // سعر الشراء لهذه الكمية
}

export interface StockReceipt {
  id: string;
  representativeId: string;
  representativeName: string;
  items: StockReceiptItem[];
  totalValue: number; // مجموع quantity * unitCost وقت الاستلام
  paidAmount: number; // المبلغ المسدد في نفس الفاتورة
  date: string;
  notes: string;
  createdAt: string;
}

export interface Payment {
  id: string;
  representativeId: string;
  representativeName: string;
  amount: number;
  date: string;
  notes: string;
  createdAt: string;
}

export interface StockMovement {
  id: string;
  productId: string;
  productName: string;
  type: 'in' | 'out' | 'return_in' | 'return_out' | 'adjust';
  quantity: number;
  reference: string;
  date: string;
  notes: string;
}

export interface CompanySettings {
  name: string;
  phone: string;
  address: string;
  logo?: string;
  currency: string;
  profitPassword: string;
}

export interface LicenseInfo {
  activated: boolean;
  type: 'trial' | 'permanent' | 'yearly';
  machineId: string;
  expiresAt?: string;
  activatedAt?: string;
}

export interface AuditLog {
  id: string;
  action: string;
  entity: string;
  entityId: string;
  details: string;
  timestamp: string;
}

/** مرتجع بضاعة إلى المندوب (إرجاع جزء من البضاعة المستلمة) */
export interface RepresentativeReturn {
  id: string;
  representativeId: string;
  representativeName: string;
  items: { productId: string; productName: string; quantity: number; unitPrice?: number }[];
  totalValue: number; // قيمة البضاعة المرجعة (لحساب الرصيد)
  date: string;
  notes: string;
  createdAt: string;
}
