#!/usr/bin/env node
/**
 * يُعيد ملفات التفعيل إلى نسختها النظيفة القابلة للقراءة/الصيانة بعد أن
 * كانت قد مُوِّهت مؤقتاً بواسطة scripts/obfuscate-license.cjs للتغليف والبيع.
 */
'use strict';
const fs = require('fs');
const path = require('path');

const ELECTRON_DIR = path.join(__dirname, '..', 'electron');
const BACKUP_DIR = path.join(ELECTRON_DIR, '.security-src');
const TARGET_FILES = ['license.cjs', 'integrity.cjs'];

let restored = 0;
for (const file of TARGET_FILES) {
  const backupPath = path.join(BACKUP_DIR, file);
  const targetPath = path.join(ELECTRON_DIR, file);
  if (fs.existsSync(backupPath)) {
    fs.copyFileSync(backupPath, targetPath);
    restored++;
    console.log(`✔ تم استرجاع ${file}`);
  }
}

if (restored === 0) {
  console.log('لا توجد نسخ محفوظة لاسترجاعها (لم يتم تشغيل obfuscate-license.cjs بعد؟)');
} else {
  console.log('\nتم استرجاع الكود الأصلي القابل للقراءة بنجاح.');
}
