/**
 * التحقق من ترخيص الهاتف — Ed25519 (مطابق حرفياً لـ electron/license.cjs)
 * ==========================================================================
 * هذا الملف "تحقق فقط" (Verify Only) تماماً كنظيره في سطح المكتب — لا يحتوي
 * على أي مفتاح خاص، فقط المفتاح العام (Public Key)، المستخرَج من نفس ملف
 * PEM المُستخدَم فعلياً في electron/license.cjs (فحصته مباشرة وتحققت من
 * تطابق استخراج المفتاح الخام بايتاً بايت قبل كتابة هذا الملف).
 *
 * لماذا @noble/ed25519 وليس Web Crypto API: دعم Ed25519 داخل SubtleCrypto
 * متفاوت وغير مضمون عبر كل إصدارات WebView أندرويد الموجودة فعلياً على
 * أجهزة العملاء، بينما @noble/ed25519 مكتبة JS بحتة تعمل بشكل متطابق على
 * أي جهاز بغض النظر عن دعم المتصفح لهذه الخوارزمية تحديداً.
 *
 * ⚠️ نفس معرّف المنتج (PROD-002) ونفس المفتاح العام المُستخرَجين مباشرة من
 * الملف الذي أرسلته. إن تغيّر أي منهما مستقبلاً في نسخة سطح المكتب، يجب
 * تحديث هذا الملف بالمثل فوراً.
 */
import { verifyAsync } from '@noble/ed25519';

const PRODUCT_ID = 'PROD-002';
const CODE_PREFIX = 'AGRI2';

// المفتاح الخام (32 بايت) المُستخرَج من PUBLIC_KEY_PEM في license.cjs —
// تحققت من هذا الاستخراج مباشرة (الرأس الثابت لمفاتيح Ed25519 بصيغة SPKI
// هو دائماً 12 بايت: 302a300506032b6570032100، والباقي هو المفتاح الخام)
const PUBLIC_KEY_HEX = '94e95cf3ac0f3bf860db7d68d7259c9365255323ea98c1127745f840489cc33f';

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes;
}

function base64UrlDecode(str: string): Uint8Array {
  const padded = str.replace(/-/g, '+').replace(/_/g, '/').padEnd(str.length + (4 - (str.length % 4)) % 4, '=');
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

interface DecodedPayload {
  productId: string;
  machineId: string;
  type: string;
  expiry: string;
  firstActivation: string;
  reissueCount: number;
  issuedAt: string;
}

function decodePayload(payloadStr: string): DecodedPayload | null {
  const parts = payloadStr.split('|');
  if (parts.length !== 7) return null;
  const [productId, machineId, type, expiry, firstActivation, reissueCount, issuedAt] = parts;
  return { productId, machineId, type, expiry, firstActivation, reissueCount: Number(reissueCount), issuedAt };
}

export interface MobileLicenseResult {
  valid: boolean;
  type?: 'permanent' | 'yearly';
  expiresAt?: string;
  message: string;
  payload?: DecodedPayload;
}

/** يتحقق من كود تفعيل بصيغة AGRI2.<payload>.<signature> — مطابق تماماً لمنطق verifyLicenseCode في license.cjs */
export async function verifyMobileLicenseCode(code: string, currentMachineId: string): Promise<MobileLicenseResult> {
  if (!code || typeof code !== 'string') {
    return { valid: false, message: 'كود التفعيل فارغ' };
  }

  const trimmed = code.trim();
  const parts = trimmed.split('.');
  if (parts.length !== 3 || parts[0] !== CODE_PREFIX) {
    return { valid: false, message: 'صيغة كود التفعيل غير صحيحة' };
  }

  let payloadStr: string, signature: Uint8Array;
  try {
    payloadStr = new TextDecoder().decode(base64UrlDecode(parts[1]));
    signature = base64UrlDecode(parts[2]);
  } catch {
    return { valid: false, message: 'تعذّر قراءة كود التفعيل' };
  }

  let sigOk = false;
  try {
    const messageBytes = new TextEncoder().encode(payloadStr);
    const publicKeyBytes = hexToBytes(PUBLIC_KEY_HEX);
    sigOk = await verifyAsync(signature, messageBytes, publicKeyBytes);
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
    return { valid: false, message: 'هذا الكود مخصص لجهاز آخر. تأكد من إرسال معرّف الجهاز الصحيح.' };
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
