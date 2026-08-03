import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Trash2, ArrowRight } from 'lucide-react';
import { useApp } from '../store/AppContext';
import { formatCurrency } from '../lib/utils';
import type { InvoiceItem } from '../types';
import { appAlert, appConfirm } from '../lib/dialogs';

export default function NewInvoice() {
  const { data, addInvoice } = useApp();
  const navigate = useNavigate();

  const [customerSearch, setCustomerSearch] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [discount, setDiscount] = useState(0);
  const [paidNow, setPaidNow] = useState(0);
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<InvoiceItem[]>([]);

  const [productSearch, setProductSearch] = useState('');
  const [selectedProductId, setSelectedProductId] = useState('');
  const [showProductList, setShowProductList] = useState(false);
  const [showCustomerList, setShowCustomerList] = useState(false);
  const [qty, setQty] = useState(1);
  const [unitPrice, setUnitPrice] = useState(0);

  const customersFiltered = data.customers.filter(c =>
    c.name.includes(customerSearch) || c.phone.includes(customerSearch)
  ).slice(0, 8);

  const productsFiltered = data.products.filter(p =>
    p.name.includes(productSearch) || p.company.includes(productSearch)
  ).slice(0, 8);

  const subtotal = items.reduce((s, i) => s + i.total, 0);
  const total = Math.max(0, subtotal - discount);

  const pickCustomer = (id: string, name: string) => {
    setCustomerId(id);
    setCustomerName(name);
    setCustomerSearch(name);
    setShowCustomerList(false);
  };

  const pickProduct = (id: string, name: string, salePrice: number) => {
    setSelectedProductId(id);
    setProductSearch(name);
    setUnitPrice(salePrice || 0);
    setShowProductList(false);
  };

  const addLine = () => {
    const product = data.products.find(p => p.id === selectedProductId);
    if (!product) {
      appAlert('اختر صنفاً من نتائج البحث');
      return;
    }
    if (qty <= 0) {
      appAlert('أدخل عدد العبوات المباعة');
      return;
    }
    if (unitPrice < 0) {
      appAlert('أدخل سعر البيع');
      return;
    }
    if (product.currentStock < qty) {
      appAlert(`المخزون غير كافٍ. المتاح: ${product.currentStock}`);
      return;
    }
    const existing = items.find(i => i.productId === product.id && i.unitPrice === unitPrice);
    if (existing) {
      const newQty = existing.quantity + qty;
      if (product.currentStock < newQty) {
        appAlert(`المخزون غير كافٍ. المتاح: ${product.currentStock}`);
        return;
      }
      setItems(items.map(i =>
        i.productId === product.id && i.unitPrice === unitPrice
          ? { ...i, quantity: newQty, total: newQty * unitPrice }
          : i
      ));
    } else {
      setItems([...items, {
        productId: product.id,
        productName: product.name,
        quantity: qty,
        unitPrice,
        total: qty * unitPrice
      }]);
    }
    setSelectedProductId('');
    setProductSearch('');
    setShowProductList(false);
    setQty(1);
    setUnitPrice(0);
  };

  const handleSave = () => {
    if (!customerId) {
      appAlert('اختر العميل');
      return;
    }

    if (items.length === 0 && paidNow <= 0) {
      appAlert('أدخل أصنافاً أو مبلغاً مسدداً على الأقل');
      return;
    }

    if (items.length === 0 && paidNow > 0) {
      if (!appConfirm('أنت لم تقم بإدخال أصناف.\nهل تريد الاستمرار وحفظ التحصيل فقط؟')) return;
      // حفظ تحصيل فقط عبر فاتورة بقيمة صفر غير منطقي - نستخدم مسار التحصيل من addInvoice بمبلغ
      // إنشاء فاتورة فارغة غير مناسب - نستدعي عبر paid فقط
      appAlert('لتسجيل مبلغ مسدد فقط بدون أصناف استخدم صفحة التحصيلات.\nأو أضف صنفاً للفاتورة.');
      return;
    }

    if (items.length > 0 && paidNow <= 0) {
      if (!appConfirm('أنت لم تدخل مبلغاً مسدداً.\nهل تريد الاستمرار؟')) return;
    }

    const ok = addInvoice({
      customerId,
      customerName,
      items,
      subtotal,
      discount,
      total,
      notes,
      date
    }, paidNow > 0 ? paidNow : 0);

    if (ok) {
      // استعادة التركيز قبل التنقل (إلكترون)
      document.body.style.pointerEvents = 'auto';
      navigate('/invoices');
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/invoices')} className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800">
          <ArrowRight className="w-5 h-5" />
        </button>
        <div>
          <h2 className="text-2xl font-bold">فاتورة بيع جديدة</h2>
          <p className="text-sm text-slate-500">ابحث عن العميل والأصناف ثم أضف البنود</p>
        </div>
      </div>

      <div className="bg-surface rounded-2xl p-6 shadow-soft border border-slate-100 dark:border-slate-700 space-y-5">
        <div className="relative">
          <label className="text-sm font-medium mb-1 block">العميل</label>
          <input
            value={customerSearch}
            onChange={e => { setCustomerSearch(e.target.value); setCustomerId(''); setShowCustomerList(true); }}
            onFocus={() => setShowCustomerList(true)}
            placeholder="ابحث باسم العميل أو رقم الهاتف..."
            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-transparent outline-none focus:ring-2 focus:ring-secondary"
          />
          {showCustomerList && customerSearch && !customerId && customersFiltered.length > 0 && (
            <div className="absolute z-20 mt-1 w-full bg-surface border border-slate-200 dark:border-slate-600 rounded-xl shadow-lg max-h-44 overflow-y-auto">
              {customersFiltered.map(c => (
                <button key={c.id} type="button" onClick={() => pickCustomer(c.id, c.name)}
                  className="w-full text-right px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-800 text-sm">
                  {c.name} {c.phone ? `— ${c.phone}` : ''}
                </button>
              ))}
            </div>
          )}
          {customerId && <p className="text-xs text-secondary mt-1">تم اختيار: {customerName}</p>}
        </div>

        <input type="date" value={date} onChange={e => setDate(e.target.value)}
          className="w-full max-w-xs px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-transparent outline-none" />

        <div className="border border-slate-200 dark:border-slate-600 rounded-xl p-4 space-y-3">
          <p className="text-sm font-medium">أصناف الفاتورة</p>
          <div className="relative">
            <input
              value={productSearch}
              onChange={e => { setProductSearch(e.target.value); setSelectedProductId(''); setShowProductList(true); }}
              onFocus={() => setShowProductList(true)}
              placeholder="ابحث عن اسم الصنف..."
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-transparent outline-none focus:ring-2 focus:ring-secondary text-sm"
            />
            {showProductList && productSearch && !selectedProductId && productsFiltered.length > 0 && (
              <div className="absolute z-20 mt-1 w-full bg-surface border border-slate-200 dark:border-slate-600 rounded-xl shadow-lg max-h-44 overflow-y-auto">
                {productsFiltered.map(p => (
                  <button key={p.id} type="button" onClick={() => pickProduct(p.id, p.name, p.salePrice)}
                    className="w-full text-right px-4 py-2 hover:bg-slate-50 dark:hover:bg-slate-800 text-sm">
                    {p.name} — مخزون: {p.currentStock}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <input type="number" min={1} value={qty || ''} onChange={e => setQty(+e.target.value)}
              placeholder="عدد العبوات" className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-transparent text-sm outline-none" />
            <input type="number" min={0} step={0.01} value={unitPrice || ''} onChange={e => setUnitPrice(+e.target.value)}
              placeholder="سعر البيع للعبوة" className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-transparent text-sm outline-none" />
            <div className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 text-sm flex items-center">
              إجمالي السطر: {formatCurrency(qty * unitPrice)}
            </div>
            <button type="button" onClick={addLine} className="bg-secondary text-white rounded-xl text-sm font-medium flex items-center justify-center gap-1">
              <Plus className="w-4 h-4" /> إضافة صنف
            </button>
          </div>

          {items.length > 0 && (
            <table className="w-full text-sm mt-2">
              <thead className="bg-slate-50 dark:bg-slate-800">
                <tr>
                  <th className="text-right p-2">الصنف</th>
                  <th className="text-right p-2">العدد</th>
                  <th className="text-right p-2">سعر البيع</th>
                  <th className="text-right p-2">الإجمالي</th>
                  <th className="p-2"></th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, idx) => (
                  <tr key={idx} className="border-t border-slate-100 dark:border-slate-700">
                    <td className="p-2">{item.productName}</td>
                    <td className="p-2">{item.quantity}</td>
                    <td className="p-2">{formatCurrency(item.unitPrice)}</td>
                    <td className="p-2 font-medium">{formatCurrency(item.total)}</td>
                    <td className="p-2">
                      <button type="button" onClick={() => setItems(items.filter((_, i) => i !== idx))} className="p-1 hover:bg-red-50 dark:hover:bg-red-900/30 rounded">
                        <Trash2 className="w-4 h-4 text-danger" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="flex flex-wrap gap-4 items-end justify-between">
          <div className="space-y-2">
            <input type="number" min={0} step={0.01} value={discount || ''} onChange={e => setDiscount(+e.target.value)}
              placeholder="الخصم (إن وجد)" className="w-40 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-transparent outline-none" />
            <input type="number" min={0} step={0.01} value={paidNow || ''} onChange={e => setPaidNow(+e.target.value)}
              placeholder="المبلغ المسدد من العميل الآن" className="w-56 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-transparent outline-none block" />
          </div>
          <div className="text-left space-y-1">
            <div className="text-sm text-slate-500">عدد الأصناف: {items.length}</div>
            <div className="text-sm text-slate-500">المجموع: {formatCurrency(subtotal)}</div>
            <div className="text-xl font-bold text-secondary">الصافي: {formatCurrency(total)}</div>
          </div>
        </div>

        <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="ملاحظات الفاتورة"
          rows={2} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-transparent outline-none" />

        <div className="flex gap-3">
          <button onClick={handleSave} className="flex-1 bg-secondary text-white py-3 rounded-xl font-medium hover:bg-emerald-600">
            حفظ فاتورة البيع
          </button>
          <button onClick={() => navigate('/invoices')} className="px-6 bg-slate-100 dark:bg-slate-700 py-3 rounded-xl">إلغاء</button>
        </div>
      </div>
    </div>
  );
}
