#!/usr/bin/env node
/**
 * توليد كود تفعيل موقَّع رقمياً (Ed25519) لعميل معيّن — يُشغَّل على جهاز البائع فقط.
 * يحتاج المفتاح الخاص المولَّد بواسطة keygen.cjs (لا يوجد في هذا الملف أي سر مُضمَّن).
 *
 * الاستخدام:
 *   node generate.cjs <machineId> [type] [years] [keyLabel]
 *
 *   machineId  - بصمة الجهاز الكاملة (32 حرف) التي أرسلها العميل من شاشة الإعدادات
 *   type       - PERM (دائم، افتراضي) أو YEAR (سنوي)
 *   years      - عدد السنوات إن كان النوع YEAR (افتراضي 1)
 *   keyLabel   - اسم زوج المفاتيح إن كنت تدير أكثر من برنامج (افتراضي "default")
 *
 * مثال:
 *   node generate.cjs A1B2C3D4E5F6... PERM
 *   node generate.cjs A1B2C3D4E5F6... YEAR 1
 *
 * ميزة مهمة: إذا طلب نفس العميل (نفس بصمة الجهاز) كوداً لهذا المنتج مرة أخرى
 * (مثلاً أعاد تثبيت البرنامج)، تُعاد له نفس تفاصيل ترخيصه الأصلي (نفس تاريخ أول
 * تفعيل) مع زيادة عدّاد "مرات إعادة الإصدار" فقط — سجل ذلك محفوظ محلياً في
 * issued/<product>.json (هذا الملف داخل .gitignore ولا يُرفع لأي مكان).
 */
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const licenseMod = require('../electron/license.cjs');

const [, , machineIdArg, typeArg, yearsArg, keyLabelArg] = process.argv;

if (!machineIdArg) {
  console.log('الاستخدام: node generate.cjs <machineId> [PERM|YEAR] [years] [keyLabel]');
  process.exit(1);
}

const machineId = machineIdArg.trim().toUpperCase();
const type = (typeArg || 'PERM').toUpperCase();
const years = Number(yearsArg || 1);
const keyLabel = keyLabelArg || 'default';

if (!/^[0-9A-F]{32}$/.test(machineId)) {
  console.error('❌ بصمة الجهاز غير صحيحة — يجب أن تكون 32 حرفاً/رقماً (انسخها كاملة من شاشة الإعدادات لدى العميل).');
  process.exit(1);
}
if (type !== 'PERM' && type !== 'YEAR') {
  console.error('❌ النوع يجب أن يكون PERM أو YEAR');
  process.exit(1);
}

const keyDir = path.join(__dirname, 'keys', keyLabel);
const privateKeyPath = path.join(keyDir, 'private-key.pem');
if (!fs.existsSync(privateKeyPath)) {
  console.error(`❌ لا يوجد مفتاح خاص بعد لـ "${keyLabel}". شغّل أولاً: node keygen.cjs ${keyLabel === 'default' ? '' : keyLabel}`);
  process.exit(1);
}
const privateKeyPem = fs.readFileSync(privateKeyPath, 'utf8');

// سجل محلي: لكل (منتج + جهاز) نحتفظ بتاريخ أول تفعيل وعدد مرات إعادة الإصدار
const issuedDir = path.join(__dirname, 'issued');
fs.mkdirSync(issuedDir, { recursive: true });
const issuedFile = path.join(issuedDir, `${licenseMod.PRODUCT_ID}.json`);
let registry = {};
if (fs.existsSync(issuedFile)) {
  try { registry = JSON.parse(fs.readFileSync(issuedFile, 'utf8')); } catch { registry = {}; }
}

const today = new Date().toISOString().slice(0, 10).replace(/-/g, ''); // YYYYMMDD
const key = machineId; // مفتاح السجل = بصمة الجهاز (لكل منتج ملف سجل منفصل أصلاً)

let record = registry[key];
if (record && record.type === type) {
  // نفس الجهاز، نفس المنتج، طلب من نفس النوع → أعد نفس تاريخ أول تفعيل وزِد عدّاد الإعادة
  record.reissueCount = (record.reissueCount || 0) + 1;
} else {
  // أول مرة لهذا الجهاز، أو تغيير نوع الترخيص → سجل جديد
  record = { firstActivation: today, reissueCount: 0, type };
}
record.lastIssuedAt = today;
registry[key] = record;

let expiry = 'PERM';
if (type === 'YEAR') {
  const d = new Date();
  d.setFullYear(d.getFullYear() + years);
  expiry = d.toISOString().slice(0, 10).replace(/-/g, '');
}

const payloadStr = licenseMod.encodePayload({
  productId: licenseMod.PRODUCT_ID,
  machineId,
  type,
  expiry,
  firstActivation: record.firstActivation,
  reissueCount: record.reissueCount,
  issuedAt: today
});

const signature = crypto.sign(null, Buffer.from(payloadStr, 'utf8'), privateKeyPem);
const code = `${licenseMod.CODE_PREFIX}.${Buffer.from(payloadStr, 'utf8').toString('base64url')}.${signature.toString('base64url')}`;

// احفظ السجل بعد نجاح التوليد فقط
fs.writeFileSync(issuedFile, JSON.stringify(registry, null, 2), 'utf8');

console.log('\n✅ كود التفعيل:\n');
console.log(code);
console.log('\n── تفاصيل ─────────────────────────────');
console.log('المنتج          :', licenseMod.PRODUCT_ID);
console.log('الجهاز           :', machineId);
console.log('النوع            :', type === 'PERM' ? 'دائم' : `سنوي (${years} سنة)`);
if (type === 'YEAR') console.log('ينتهي في        :', expiry.replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3'));
console.log('أول تفعيل        :', record.firstActivation.replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3'));
console.log('مرات إعادة الإصدار:', record.reissueCount);
console.log('────────────────────────────────────────');

// تحقق ذاتي فوري (Sanity check) قبل تسليم الكود للعميل
const check = licenseMod.verifyLicenseCode(code, machineId);
if (!check.valid) {
  console.error('\n⚠️  تحذير: الكود المولَّد لم يجتز التحقق الذاتي! لا تُسلّمه للعميل. السبب:', check.message);
  process.exit(1);
} else {
  console.log('✔ تم التحقق الذاتي من الكود بنجاح — جاهز للإرسال للعميل.');
}
