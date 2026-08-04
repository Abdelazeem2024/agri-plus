#!/usr/bin/env node
/**
 * تمويه (Obfuscation) اختياري لملفَي التفعيل الحساسَين فقط قبل التغليف النهائي.
 * هذا طبقة "رفع كلفة القراءة" إضافية فوق الحماية الحقيقية (التوقيع الرقمي)،
 * وليست بديلاً عنها — حتى بدونها، لا يمكن توليد أكواد مزوَّرة لأن السر
 * الحقيقي (المفتاح الخاص) غير موجود في هذا الملف أصلاً مهما موّهته أو لا.
 *
 * الاستخدام:
 *   1) npm install --save-dev javascript-obfuscator   (مرة واحدة، يحتاج إنترنت)
 *   2) npm run obfuscate:security   (قبل npm run electron:build:win)
 *   3) بعد التغليف: npm run restore:security-src  (لإرجاع الكود القابل للقراءة والصيانة)
 *
 * ملاحظة: electron:build:secure في package.json يقوم بكل هذه الخطوات تلقائياً.
 */
'use strict';
const fs = require('fs');
const path = require('path');

const ELECTRON_DIR = path.join(__dirname, '..', 'electron');
const BACKUP_DIR = path.join(ELECTRON_DIR, '.security-src');
const TARGET_FILES = ['license.cjs', 'integrity.cjs'];

let obfuscator;
try {
  obfuscator = require('javascript-obfuscator');
} catch {
  console.error(
    '❌ الحزمة javascript-obfuscator غير مثبَّتة.\n' +
    '   شغّل أولاً (يحتاج إنترنت مرة واحدة فقط):\n' +
    '   npm install --save-dev javascript-obfuscator\n' +
    '   ثم أعد تشغيل هذا الأمر.'
  );
  process.exit(1);
}

fs.mkdirSync(BACKUP_DIR, { recursive: true });

for (const file of TARGET_FILES) {
  const srcPath = path.join(ELECTRON_DIR, file);
  const backupPath = path.join(BACKUP_DIR, file);

  // احفظ نسخة نظيفة قابلة للقراءة إن لم تكن محفوظة بالفعل (لا نكتب فوق نسخة مموَّهة سابقة بالخطأ)
  if (!fs.existsSync(backupPath)) {
    fs.copyFileSync(srcPath, backupPath);
  }

  const cleanSource = fs.readFileSync(backupPath, 'utf8');
  const result = obfuscator.obfuscate(cleanSource, {
    compact: true,
    controlFlowFlattening: true,
    controlFlowFlatteningThreshold: 0.75,
    deadCodeInjection: true,
    deadCodeInjectionThreshold: 0.4,
    stringArray: true,
    stringArrayEncoding: ['base64'],
    stringArrayThreshold: 0.75,
    identifierNamesGenerator: 'hexadecimal',
    renameGlobals: false,
    selfDefending: true,
    disableConsoleOutput: false
  });

  fs.writeFileSync(srcPath, result.getObfuscatedCode(), 'utf8');
  console.log(`✔ تم تمويه ${file}`);
}

console.log('\nتم. لا تنسَ تشغيل: npm run restore:security-src بعد انتهاء التغليف لإرجاع الكود القابل للصيانة.');
