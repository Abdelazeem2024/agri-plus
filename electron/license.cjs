/**
 * المبيدات الزراعيه — نظام التفعيل بالتوقيع الرقمي (Ed25519 Digital Signature)
 * ==========================================================================
 * هذا الملف يحتوي على منطق "التحقق فقط" — يُشحن داخل برنامج العميل الخاص
 * بهذا المنتج فقط. لا يحتوي هذا الملف على أي مفتاح خاص (Private Key) أو أي
 * سرّ يمكن استخدامه لتوليد أكواد تفعيل جديدة. المفتاح الخاص يبقى فقط في
 * license-generator/keys/PROD-002/ على جهاز البائع.
 *
 * هذا الملف مولَّد تلقائياً من أداة تفعيل Agri Plus (قالب موحّد لكل البرامج)
 * بتاريخ 2026-08-08. كل برنامج معزول تماماً عن غيره عبر PRODUCT_ID
 * ومفتاح عام مختلفين: كود هذا البرنامج لن يعمل إطلاقاً على أي برنامج آخر.
 *
 * صيغة كود التفعيل:
 *   AGRI2.<payload بترميز base64url>.<التوقيع بترميز base64url>
 *
 * حقول الـ payload (مفصولة بـ |):
 *   productId | machineId | type | expiry | firstActivation | reissueCount | issuedAt
 */
'use strict';
const crypto = require('crypto');
const os = require('os');

// ─────────────────────────────────────────────────────────────────────────
const PRODUCT_ID = 'PROD-002';

const PUBLIC_KEY_PEM = `-----BEGIN PUBLIC KEY-----
MCowBQYDK2VwAyEAlOlc86wPO/hg231o1yWck2UlUyPqmMESd0X4QEicwz8=
-----END PUBLIC KEY-----`;

const CODE_PREFIX = 'AGRI2';
// ─────────────────────────────────────────────────────────────────────────

function getMachineId() {
  const hostname = os.hostname();
  const platform = os.platform();
  const arch = os.arch();
  const cpuModel = os.cpus()[0]?.model || 'unknown';
  const totalMem = String(os.totalmem());
  const raw = `${hostname}|${platform}|${arch}|${cpuModel}|${totalMem}`;
  return crypto.createHash('sha256').update(raw).digest('hex').substring(0, 32).toUpperCase();
}

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

  if (payload.productId !== PRODUCT_ID) {
    return { valid: false, message: 'هذا الكود لا يخص هذا البرنامج' };
  }

  if (payload.machineId !== currentMachineId) {
    return { valid: false, message: 'هذا الكود مخصص لجهاز آخر. تأكد من إرسال بصمة الجهاز الصحيحة.' };
  }

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
  isStoredLicenseValid
};
