/**
 * النسخ الاحتياطي التلقائي اليومي
 * ==================================
 * منفصل تماماً عن التصدير اليدوي (الذي يبقى كما هو من داخل شاشة الإعدادات).
 * يعمل بالكامل داخل العملية الرئيسية لـ Electron حتى يستمر بغض النظر عن
 * الصفحة المفتوحة في الواجهة، ويستخدم بالضبط نفس دالة exportJson() المستخدمة
 * في التصدير اليدوي — نفس البيانات الكاملة، بدون أي فرق أو نقص.
 *
 * آلية العمل: تطبيقات سطح المكتب لا تعمل في الخلفية 24 ساعة بشكل موثوق، لذلك
 * الأسلوب العملي الصحيح هو: عند كل إقلاع للبرنامج، وكل ساعة أثناء بقائه مفتوحاً،
 * نتحقق: "هل أُخذت نسخة اليوم بالفعل؟" — إن لم تكن، نأخذها فوراً تلقائياً.
 * هذا يضمن نسخة واحدة يومياً بالضبط بمجرد أن يُفتح البرنامج في ذلك اليوم،
 * بدون الحاجة لأي جدولة نظام تشغيل معقدة.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { app } = require('electron');

const CONFIG_FILE = path.join(app.getPath('userData'), 'backup-config.json');
const BACKUP_PREFIX = 'agriplus-auto-backup-';
const RETENTION_DAYS = 14; // أسبوعان

function todayStr() {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD
}

function loadConfig() {
  try {
    const raw = fs.readFileSync(CONFIG_FILE, 'utf8');
    const cfg = JSON.parse(raw);
    return {
      backupPath: cfg.backupPath || '',
      enabled: !!cfg.enabled,
      lastBackupDate: cfg.lastBackupDate || '',
      lastBackupStatus: cfg.lastBackupStatus || '',
      retentionDays: Number.isFinite(cfg.retentionDays) ? cfg.retentionDays : RETENTION_DAYS
    };
  } catch {
    return { backupPath: '', enabled: false, lastBackupDate: '', lastBackupStatus: '', retentionDays: RETENTION_DAYS };
  }
}

function saveConfig(cfg) {
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(cfg, null, 2), 'utf8');
}

/** يحذف نسخ التصدير التلقائي الأقدم من مدة الاحتفاظ المحددة، دون المساس بأي ملف آخر */
function cleanupOldBackups(dir, retentionDays) {
  let removed = 0;
  try {
    const files = fs.readdirSync(dir);
    const cutoff = Date.now() - retentionDays * 24 * 60 * 60 * 1000;
    for (const file of files) {
      // نتحقق من الاسم (بادئة مخصصة لملفاتنا فقط) حتى لا نلمس أي ملف آخر
      // للمستخدم قد يكون محفوظاً في نفس المجلد بالخطأ
      if (!file.startsWith(BACKUP_PREFIX) || !file.endsWith('.json')) continue;
      const filePath = path.join(dir, file);
      try {
        const stat = fs.statSync(filePath);
        if (stat.mtimeMs < cutoff) {
          fs.unlinkSync(filePath);
          removed++;
        }
      } catch { /* تجاهل ملف تعذّر الوصول إليه ولا نوقف بقية التنظيف */ }
    }
  } catch { /* المجلد نفسه غير متاح — سيُبلَّغ عنه في نتيجة النسخ نفسها */ }
  return removed;
}

/**
 * يُنفَّذ عند كل فحص (إقلاع + كل ساعة). يأخذ نسخة فقط إذا: الميزة مفعّلة،
 * يوجد مسار محدد صالح، ولم تُؤخَذ نسخة اليوم بعد.
 */
function maybeRunAutoBackup(exportJsonFn) {
  const cfg = loadConfig();
  if (!cfg.enabled || !cfg.backupPath) return { ran: false };

  const today = todayStr();
  if (cfg.lastBackupDate === today) return { ran: false }; // أُخذت بالفعل اليوم

  try {
    if (!fs.existsSync(cfg.backupPath)) {
      cfg.lastBackupStatus = 'فشل: المسار المحدد لم يعد موجوداً — تحقق منه في الإعدادات';
      saveConfig(cfg);
      return { ran: false, error: cfg.lastBackupStatus };
    }

    const json = exportJsonFn();
    const fileName = `${BACKUP_PREFIX}${today}.json`;
    const filePath = path.join(cfg.backupPath, fileName);
    fs.writeFileSync(filePath, json, 'utf8');

    const removed = cleanupOldBackups(cfg.backupPath, cfg.retentionDays);

    cfg.lastBackupDate = today;
    cfg.lastBackupStatus = `نجحت آخر نسخة بتاريخ ${today}${removed ? ` — وحُذفت ${removed} نسخة قديمة` : ''}`;
    saveConfig(cfg);
    return { ran: true, filePath, removed };
  } catch (e) {
    cfg.lastBackupStatus = 'فشل: ' + e.message;
    saveConfig(cfg);
    return { ran: false, error: e.message };
  }
}

module.exports = { loadConfig, saveConfig, maybeRunAutoBackup, todayStr };
