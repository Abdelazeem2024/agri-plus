/**
 * فحص سلامة الملفات (Integrity Check)
 * =====================================
 * يحمي من سيناريو لا يمنعه أي نظام توقيع رقمي بمفرده: أن يقوم شخص بتعديل
 * ملف `license.cjs` نفسه ليجعل دالة التحقق تُعيد "صحيح" دائماً بغض النظر عن
 * الكود المُدخَل، متجاوزاً كل آلية التوقيع تماماً بدون الحاجة لمعرفة أي مفتاح.
 *
 * الطريقة: عند بناء النسخة النهائية للبيع (قبل التغليف)، نحسب بصمة SHA-256
 * للملفات الحساسة ونحفظها في integrity-manifest.json. عند تشغيل البرنامج،
 * نعيد حساب نفس البصمات ونقارنها. أي اختلاف يعني أن أحد الملفات تغيّر منذ
 * البناء الرسمي.
 *
 * حدود هذا الفحص (بصراحة): شخص متمرّس جداً يمكنه نظرياً تعديل هذا الملف نفسه
 * ليتجاوز فحصه، أو إعادة توليد ملف manifest ليطابق نسخته المعدَّلة. لا يوجد
 * حل برمجي بحت من طرف العميل يمنع هذا 100% بدون خادم/عتاد خاص (TPM). الهدف
 * هنا هو رفع كلفة وصعوبة التلاعب، وليس ضماناً مطلقاً — طبقة حماية إضافية
 * فوق التوقيع الرقمي، وليست بديلاً عنه.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const MANIFEST_PATH = path.join(__dirname, 'integrity-manifest.json');

// الملفات الحساسة التي نراقب سلامتها (منطق التفعيل ونقاط الدخول الرئيسية)
const WATCHED_FILES = ['license.cjs', 'main.cjs', 'db.cjs', 'preload.cjs'];

function hashFile(filePath) {
  const buf = fs.readFileSync(filePath);
  return crypto.createHash('sha256').update(buf).digest('hex');
}

/** يُستدعى مرة واحدة أثناء البناء (قبل التغليف النهائي) لإنشاء/تحديث الـ manifest */
function generateManifest() {
  const manifest = {};
  for (const file of WATCHED_FILES) {
    const p = path.join(__dirname, file);
    if (fs.existsSync(p)) manifest[file] = hashFile(p);
  }
  fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2), 'utf8');
  return manifest;
}

/**
 * يُستدعى عند إقلاع البرنامج للتحقق من عدم تعديل الملفات منذ البناء الرسمي.
 * @returns {{ ok: boolean, mismatches: string[], checked: boolean }}
 *          checked=false يعني عدم وجود manifest أصلاً (بيئة تطوير غالباً) — لا نُفشل الفحص حينها
 */
function checkIntegrity() {
  if (!fs.existsSync(MANIFEST_PATH)) {
    return { ok: true, mismatches: [], checked: false };
  }
  let manifest;
  try {
    manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));
  } catch {
    return { ok: false, mismatches: ['integrity-manifest.json تالف'], checked: true };
  }

  const mismatches = [];
  for (const file of WATCHED_FILES) {
    const expected = manifest[file];
    if (!expected) continue; // ملف لم يكن موجوداً وقت البناء، تجاهله
    const p = path.join(__dirname, file);
    if (!fs.existsSync(p)) { mismatches.push(file + ' (مفقود)'); continue; }
    const actual = hashFile(p);
    if (actual !== expected) mismatches.push(file);
  }

  return { ok: mismatches.length === 0, mismatches, checked: true };
}

module.exports = { generateManifest, checkIntegrity, WATCHED_FILES };
