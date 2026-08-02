# Agri Plus

**إدارة ذكية... ونمو مستمر.**

برنامج محاسبي احترافي لسطح المكتب — مخصص لمحلات وشركات المبيدات الزراعية.

الإصدار: **1.6.2**

---

## المميزات

- عملاء · فواتير · تحصيلات · مرتجعات · كشف حساب عميل · رصيد افتتاحي
- مندوبون · استلام بضاعة · مدفوعات · مرتجعات مندوب · كشف حساب مندوب
- أصناف · مخزون تلقائي · منع البيع تحت الصفر
- أرباح محمية بكلمة مرور (تكلفة وقت البيع + عكس تكلفة المرتجع)
- تقارير PDF/Excel عربية · نسخ احتياطي JSON
- ترخيص Offline موقّع (HMAC) مرتبط بالجهاز · تجربة 3 أيام
- واجهة RTL عربية · الوضع الليلي

---

## التشغيل المحلي (تطوير)

```bash
npm install
npm run electron:dev
```

## البناء على جهازك (Windows)

```bash
npm install
npm run electron:build:win
```

الملف يظهر في مجلد `release/` باسم مثل:

`Agri Plus Setup 1.6.x.exe`

> `better-sqlite3` وحدة أصلية — يُفضَّل البناء على Windows أو عبر GitHub Actions.

---

## الحصول على Setup.exe من GitHub (موصى به)

### 1) ارفع المشروع

1. أنشئ مستودعًا جديدًا على GitHub (مثلاً `agri-plus`)
2. فك ضغط هذا الأرشيف
3. داخل مجلد المشروع:

```bash
git init
git add .
git commit -m "Agri Plus v1.6.2"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/agri-plus.git
git push -u origin main
```

### 2) ابنِ المثبت تلقائيًا

**طريقة أ:** من تبويب Actions → **Build and Release** → **Run workflow**

**طريقة ب:** عبر وسم إصدار:

```bash
git tag v1.6.2
git push origin v1.6.2
```

بعد انتهاء البناء:
- حمّل `AgriPlus-Windows` من **Artifacts** في الـ Action
- أو من **Releases** إذا استخدمت وسم `v*`

---

## التفعيل للعملاء

1. العميل ينسخ **Machine ID** من الإعدادات
2. أنت (البائع) تولّد الكود:

```bash
node license-generator/generate.cjs <MACHINE_ID> PERM
# أو ترخيص سنوي:
node license-generator/generate.cjs <MACHINE_ID> YEAR 1
```

3. أرسل الكود للعميل → يفعّل من الإعدادات

كلمة مرور الأرباح الافتراضية: `1234` (يغيّرها العميل من الإعدادات)

---

## التقنيات

Electron · React · TypeScript · Vite · better-sqlite3 · Drizzle · Tailwind CSS · jsPDF · SheetJS

---

## اختبارات

```bash
node tests/accounting-test.mjs
```
