/**
 * التحقق من ترخيص الهاتف — تطابق كامل مع خوارزمية electron/license.cjs
 * ==========================================================================
 * لا يوجد Node.js على الهاتف، لذا أعدنا كتابة نفس منطق HMAC-SHA256 هنا باستخدام
 * Web Crypto API المدعومة أصلاً داخل أي WebView حديث (بخلاف خوارزميات مثل
 * Ed25519 التي دعمها متفاوت عبر الأجهزة). النتيجة: **نفس أداة توليد التراخيص
 * التي يستخدمها البائع لسطح المكتب تصلح لتوليد أكواد الهاتف أيضاً بدون أي
 * أداة جديدة** — فقط يحتاج البائع معرّف الهاتف (Device ID) بدل Machine ID.
 *
 * ⚠️ ملاحظة مهمة: هذا الملف مطابق حرفياً لخوارزمية HMAC-SHA256 الموجودة في
 * نسخة electron/license.cjs التي تحققت منها مباشرة. إن كانت نسختكم الفعلية
 * الحالية على GitHub تستخدم خوارزمية مختلفة (تم تطويرها في جلسة سابقة لم
 * تعد متاحة لي)، أخبرني فوراً لأُطابق هذا الملف معها بدقة قبل الاستخدام.
 */

// نفس السر المُشفَّر (obfuscated) الموجود بالضبط في electron/license.cjs —
// يجب أن يبقى متطابقاً حرفياً بين الملفين دائماً
const _p = ['AgRi', 'PlUs', '2026', 'LiCeNsE', 'K3y!', 'xA1', 'SqLt', 'Pr0'];
function getSecret(): string {
  return _p.join('') + 'SECURE_OFFLINE_V2';
}

async function hmacSha256Hex(secret: string, payload: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sigBuffer = await crypto.subtle.sign('HMAC', key, encoder.encode(payload));
  const bytes = Array.from(new Uint8Array(sigBuffer));
  return bytes.map(b => b.toString(16).padStart(2, '0')).join('');
}

function deviceShort(deviceId: string): string {
  return (deviceId || '').substring(0, 8).toUpperCase();
}

export interface MobileLicenseResult {
  valid: boolean;
  type?: 'permanent' | 'yearly';
  expiresAt?: string;
  message: string;
}

/** يتحقق من كود تفعيل (بنفس صيغة سطح المكتب بالضبط: AGRI-TYPE-DEVICE8-EXPIRY-SIG) */
export async function validateMobileLicense(code: string, deviceId: string): Promise<MobileLicenseResult> {
  if (!code || typeof code !== 'string') {
    return { valid: false, message: 'كود التفعيل فارغ' };
  }

  const upper = code.trim().toUpperCase().replace(/\s+/g, '');
  const parts = upper.split('-');
  if (parts.length !== 5 || parts[0] !== 'AGRI') {
    return { valid: false, message: 'صيغة كود التفعيل غير صحيحة' };
  }

  const [, type, mid, expiryPart, sig] = parts;

  if (type !== 'PERM' && type !== 'YEAR') {
    return { valid: false, message: 'نوع الترخيص غير معروف' };
  }

  const expectedMid = deviceShort(deviceId);
  if (mid !== expectedMid) {
    return { valid: false, message: 'الكود غير مخصص لهذا الجهاز' };
  }

  const payload = `AGRI|${type}|${mid}|${expiryPart}`;
  const fullSig = await hmacSha256Hex(getSecret(), payload);
  const expectedSig = fullSig.substring(0, 8).toUpperCase();
  if (sig !== expectedSig) {
    return { valid: false, message: 'التوقيع غير صالح — كود مزور أو تالف' };
  }

  if (type === 'PERM') {
    return { valid: true, type: 'permanent', message: 'ترخيص دائم صالح' };
  }

  if (!/^\d{8}$/.test(expiryPart)) {
    return { valid: false, message: 'تاريخ انتهاء غير صالح' };
  }
  const expStr = `${expiryPart.slice(0, 4)}-${expiryPart.slice(4, 6)}-${expiryPart.slice(6, 8)}`;
  const expDate = new Date(expStr + 'T23:59:59');
  if (isNaN(expDate.getTime())) {
    return { valid: false, message: 'تاريخ انتهاء غير صالح' };
  }
  if (expDate < new Date()) {
    return { valid: false, message: 'انتهت صلاحية هذا الترخيص' };
  }

  return {
    valid: true,
    type: 'yearly',
    expiresAt: expDate.toISOString(),
    message: 'ترخيص سنوي صالح حتى ' + expStr
  };
}
