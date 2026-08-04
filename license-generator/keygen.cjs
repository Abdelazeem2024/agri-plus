#!/usr/bin/env node
/**
 * يُشغَّل مرة واحدة فقط لكل برنامج (منتج) عند إطلاقه لأول مرة.
 * ينشئ زوج مفاتيح Ed25519:
 *   - المفتاح الخاص (private-key.pem): يبقى في هذا المجلد على جهازك فقط.
 *     لا تشاركه مع أحد، ولا ترفعه على GitHub (موجود في .gitignore بالفعل).
 *   - المفتاح العام (public-key.txt): تنسخه وتلصقه داخل PUBLIC_KEY_PEM في
 *     ملف electron/license.cjs بالمشروع الرئيسي — هذا هو الجزء الوحيد الذي
 *     يُشحن مع برنامج العميل.
 *
 * تحذير: إذا كنت تولّد مفاتيح لأول مرة فقط. إعادة تشغيل هذا الملف يستبدل
 * المفاتيح الحالية بأخرى جديدة، ما يُسقط صلاحية كل الأكواد التي وُلِّدت
 * بالمفتاح القديم! استخدمه فقط عند إطلاق برنامج جديد لأول مرة.
 *
 * الاستخدام:
 *   node keygen.cjs                  → يولّد مفاتيح لملف افتراضي واحد
 *   node keygen.cjs libraries-app     → يولّد مفاتيح منفصلة لبرنامج باسم "libraries-app"
 *                                        (مفيد عند إدارة عدة برامج من نفس المجلد)
 */
'use strict';
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

const label = process.argv[2] || 'default';
const outDir = path.join(__dirname, 'keys', label);

function ask(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(resolve => rl.question(question, ans => { rl.close(); resolve(ans); }));
}

async function main() {
  if (fs.existsSync(path.join(outDir, 'private-key.pem'))) {
    const ans = await ask(
      `⚠️  يوجد بالفعل مفتاح خاص محفوظ لـ "${label}" في:\n   ${outDir}\n` +
      `توليد مفتاح جديد سيُسقط صلاحية كل الأكواد القديمة الموقَّعة بالمفتاح الحالي.\n` +
      `اكتب "نعم" للمتابعة والاستبدال، أو أي شيء آخر للإلغاء: `
    );
    if (ans.trim() !== 'نعم' && ans.trim().toLowerCase() !== 'yes') {
      console.log('تم الإلغاء. لم يتغيّر شيء.');
      return;
    }
  }

  fs.mkdirSync(outDir, { recursive: true });

  const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519');
  const pubPem = publicKey.export({ type: 'spki', format: 'pem' }).toString();
  const privPem = privateKey.export({ type: 'pkcs8', format: 'pem' }).toString();

  fs.writeFileSync(path.join(outDir, 'private-key.pem'), privPem, { mode: 0o600 });
  fs.writeFileSync(path.join(outDir, 'public-key.txt'), pubPem, { mode: 0o644 });

  console.log('\n✅ تم توليد زوج مفاتيح جديد بنجاح لـ "' + label + '"');
  console.log('   المفتاح الخاص (لا تشاركه): ' + path.join(outDir, 'private-key.pem'));
  console.log('   المفتاح العام (آمن للمشاركة): ' + path.join(outDir, 'public-key.txt'));
  console.log('\n── الخطوة التالية ──────────────────────────────────────────');
  console.log('انسخ النص التالي بالكامل والصقه مكان PUBLIC_KEY_PEM في electron/license.cjs:\n');
  console.log(pubPem);
  console.log('────────────────────────────────────────────────────────────');
  console.log('ثم غيّر PRODUCT_ID في نفس الملف إلى معرّف فريد لهذا البرنامج إن كان منتجاً جديداً.');
}

main().catch(err => {
  console.error('خطأ:', err.message);
  process.exit(1);
});
