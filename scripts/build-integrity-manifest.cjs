#!/usr/bin/env node
/**
 * يُشغَّل تلقائياً كجزء من عملية البناء النهائية (قبل electron-builder) لحساب
 * بصمات SHA-256 لملفات التفعيل الحساسة وحفظها في electron/integrity-manifest.json.
 * هذا الملف يُقارَن به عند تشغيل البرنامج لدى العميل لاكتشاف أي تعديل لاحق
 * على ملفات التفعيل نفسها (راجع electron/integrity.cjs للتفاصيل).
 *
 * لا حاجة لتشغيله يدوياً — مربوط تلقائياً بأمر: npm run electron:build
 */
const { generateManifest } = require('../electron/integrity.cjs');

const manifest = generateManifest();
const count = Object.keys(manifest).length;
console.log(`✔ integrity-manifest.json: تم حساب بصمات ${count} ملفات (${Object.keys(manifest).join(', ')})`);
