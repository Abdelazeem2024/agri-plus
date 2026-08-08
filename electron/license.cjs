/**
 * Agri Plus — نظام التفعيل بالتوقيع الرقمي (Ed25519 Digital Signature)
 * ==========================================================================
 * هذا الملف يحتوي على منطق "التحقق فقط" — يُشحن داخل برنامج العميل.
 * لا يحتوي هذا الملف، ولا أي ملف آخر داخل مجلد `electron/`، على أي مفتاح خاص
 * (Private Key) أو أي سرّ (Secret) يمكن استخدامه لتوليد أكواد تفعيل جديدة.
 * المفتاح الخاص يعيش فقط في مجلد `license-generator/` على جهاز البائع، ولا
 * يُشحَن أبداً مع البرنامج (راجع license-generator/.gitignore).
 *
 * لماذا هذا أقوى من نظام HMAC/سر مشترك سابق؟
 * HMAC يحتاج نفس السر لدى الطرفين (المولِّد والمتحقِّق) — وبما أن المتحقِّق
 * يعمل داخل جهاز العميل، فالسر بالضرورة موجود هناك ويمكن استخراجه من الملفات.
 * أما هنا: المفتاح العام (هذا الملف) عديم الفائدة لتوليد توقيعات جديدة — فك
 * تجميع البرنامج بالكامل، أو حتى قراءته بواسطة أي أداة ذكاء اصطناعي، لن يمنح
 * أي شخص القدرة على توليد كود تفعيل صالح لم يُوقَّع فعلياً بالمفتاح الخاص.
 *
 * صيغة كود التفعيل:
 *   AGRI2.<payload بترميز base64url>.<التوقيع بترميز base64url>
 *
 * حقول الـ payload (مفصولة بـ |):
 *   productId | machineId | type | expiry | firstActivation | reissueCount | issuedAt
 *
 * التوسّع لبرامج مستقبلية (مكتبات، إلخ):
 *   1) شغّل license-generator/keygen.cjs مرة واحدة لكل برنامج جديد لتوليد زوج مفاتيح خاص به.
 *   2) غيّر PRODUCT_ID أدناه إلى معرّف فريد لهذا البرنامج الجديد.
 *   3) الصق المفتاح العام الجديد في PUBLIC_KEY_PEM أدناه.
 *   بهذا يصبح كل برنامج معزولاً تماماً عن غيره: كود لبرنامج المبيدات لن يعمل
 *   إطلاقاً على برنامج المكتبات والعكس، حتى لو استُخدم نفس هذا الملف كقالب.
 */
'use strict';
const crypto = require('crypto');
const os = require('os');

// ─────────────────────────────────────────────────────────────────────────
// معرّف هذا البرنامج تحديداً — فريد لكل منتج، جزء من الـ payload الموقَّع
const PRODUCT_ID = 'AGRIPLUS-V1';

// المفتاح العام فقط (آمن تماماً أن يكون هنا ومكشوفاً — لا يمكن استخدامه للتوليد)
// يُستبدل تلقائياً بعد تشغيل license-generator/keygen.cjs
let PUBLIC_KEY_PEM = `-----BEGIN PUBLIC KEY-----
MCowBQYDK2VwAyEAOJLq7XPqFu9mxuqkAxZPgR/icNMwlAvlw8qgIEUZVpo=
-----END PUBLIC KEY-----`;
const __ORIGINAL_PUBLIC_KEY_PEM = PUBLIC_KEY_PEM;

const CODE_PREFIX = 'AGRI2';
// ─────────────────────────────────────────────────────────────────────────

/**
 * بصمة الجهاز (Machine Fingerprint) — مبنية من خصائص عتاد/نظام ثابتة عادةً
 * حتى بعد إعادة تثبيت البرنامج على نفس الجهاز (لا تتغير بحذف بيانات البرنامج).
 */
function getMachineId() {
  const hostname = os.hostname();
  const platform = os.platform();
  const arch = os.arch();
  const cpuModel = os.cpus()[0]?.model || 'unknown';
  const totalMem = String(os.totalmem());
  const raw = `${hostname}|${platform}|${arch}|${cpuModel}|${totalMem}`;
  return crypto.createHash('sha256').update(raw).digest('hex').substring(0, 32).toUpperCase();
}

/** ترميز الحقول إلى نص الـ payload القانوني (نفس الترتيب دائماً — يُستخدم للتوقيع والتحقق معاً) */
function encodePayload(fields) {
  const { productId, machineId, type, expiry, firstActivation, reissueCount, issuedAt } = fields;
  return [productId, machineId, type, expiry, firstActivation, String(reissueCount), issuedAt].join('|');
}

function decodePayload(payloadStr) {
  const parts = payloadStr.split('|');
  if (parts.length !== 7) return null;
  const [productId, machineId, type, expiry, firstActivation, reissueCount, issuedAt] = parts;
  return { productId, machineId, type, expiry, firstActivation, reissueCount: Number(reissueCount), issuedAt };
}

/**
 * التحقق من كود تفعيل مقابل الجهاز الحالي — تحقق كامل محلي، لا إنترنت، لا سر مشترك.
 * @returns {{valid:boolean, message:string, type?:string, expiresAt?:string, payload?:object}}
 */
function verifyLicenseCode(code, currentMachineId) {
  if (!code || typeof code !== 'string') {
    return { valid: false, message: 'كود التفعيل فارغ' };
  }

  const trimmed = code.trim();
  const parts = trimmed.split('.');
  if (parts.length !== 3 || parts[0] !== CODE_PREFIX) {
    return { valid: false, message: 'صيغة كود التفعيل غير صحيحة' };
  }

  let payloadStr, signature;
  try {
    payloadStr = Buffer.from(parts[1], 'base64url').toString('utf8');
    signature = Buffer.from(parts[2], 'base64url');
  } catch {
    return { valid: false, message: 'تعذّر قراءة كود التفعيل' };
  }

  // 1) التحقق من التوقيع الرقمي أولاً — أي تعديل ولو بحرف واحد في البيانات يُسقط هذا الفحص
  let sigOk = false;
  try {
    sigOk = crypto.verify(null, Buffer.from(payloadStr, 'utf8'), PUBLIC_KEY_PEM, signature);
  } catch {
    sigOk = false;
  }
  if (!sigOk) {
    return { valid: false, message: 'التوقيع غير صالح — كود مزوّر أو تالف' };
  }

  const payload = decodePayload(payloadStr);
  if (!payload) {
    return { valid: false, message: 'بيانات الكود غير مكتملة' };
  }

  // 2) الربط بالمنتج — كود برنامج آخر يُرفض هنا حتى لو كان موقَّعاً بنفس المفتاح بالخطأ
  if (payload.productId !== PRODUCT_ID) {
    return { valid: false, message: 'هذا الكود لا يخص هذا البرنامج' };
  }

  // 3) الربط بالجهاز
  if (payload.machineId !== currentMachineId) {
    return { valid: false, message: 'هذا الكود مخصص لجهاز آخر. تأكد من إرسال بصمة الجهاز الصحيحة.' };
  }

  // 4) نوع الترخيص وصلاحيته
  if (payload.type === 'PERM') {
    return { valid: true, type: 'permanent', message: 'ترخيص دائم صالح', payload };
  }

  if (payload.type === 'YEAR') {
    if (!/^\d{8}$/.test(payload.expiry)) {
      return { valid: false, message: 'تاريخ انتهاء غير صالح' };
    }
    const expStr = `${payload.expiry.slice(0, 4)}-${payload.expiry.slice(4, 6)}-${payload.expiry.slice(6, 8)}`;
    const expDate = new Date(expStr + 'T23:59:59');
    if (isNaN(expDate.getTime())) {
      return { valid: false, message: 'تاريخ انتهاء غير صالح' };
    }
    if (expDate.getTime() < Date.now()) {
      return { valid: false, message: 'انتهت صلاحية هذا الترخيص بتاريخ ' + expStr };
    }
    return {
      valid: true,
      type: 'yearly',
      expiresAt: expDate.toISOString(),
      message: 'ترخيص سنوي صالح حتى ' + expStr,
      payload
    };
  }

  return { valid: false, message: 'نوع ترخيص غير معروف' };
}

/**
 * إعادة التحقق الكاملة من الترخيص المخزَّن محلياً — تُستدعى في كل إقلاع للبرنامج.
 * مهم جداً: لا نثق أبداً بعلامة "activated=true" وحدها المخزَّنة في قاعدة البيانات
 * (يمكن لأي شخص فتح ملف SQLite وتعديلها يدوياً)، بل نعيد التحقق من صحة الكود
 * المخزَّن نفسه بالكامل (التوقيع + الجهاز + الصلاحية) في كل مرة.
 */
function isStoredLicenseValid(storedCode, currentMachineId) {
  if (!storedCode) return { valid: false, message: 'لا يوجد ترخيص مخزَّن' };
  return verifyLicenseCode(storedCode, currentMachineId);
}

module.exports = {
  PRODUCT_ID,
  CODE_PREFIX,
  getMachineId,
  encodePayload,
  decodePayload,
  verifyLicenseCode,
  isStoredLicenseValid,
  // أدوات اختبار فقط — لا تُستخدم أبداً في كود التشغيل الفعلي، فقط في tests/*
  // للسماح بحقن مفتاح عام تجريبي معزول عن مفتاح الإنتاج الحقيقي
  __setTestPublicKey(pem) { PUBLIC_KEY_PEM = pem; },
  __restorePublicKey() { PUBLIC_KEY_PEM = __ORIGINAL_PUBLIC_KEY_PEM; }
};
