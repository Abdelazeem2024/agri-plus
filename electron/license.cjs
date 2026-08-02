/**
 * Agri Plus - Offline License System (Strengthened)
 *
 * Format of license key:
 *   AGRI-<TYPE>-<MACHINE8>-<EXPIRYYYMMDD or PERM>-<SIGNATURE8>
 *
 * Signature = first 8 chars of HMAC-SHA256(payload, SECRET)
 * Secret is embedded and obfuscated (not public-facing protection, but stops casual cracking).
 *
 * Types: TRIAL (handled by app), PERM (permanent), YEAR (1 year from activation or encoded expiry)
 */
const crypto = require('crypto');
const os = require('os');

// Obfuscated secret parts (joined at runtime)
const _p = ['AgRi', 'PlUs', '2026', 'LiCeNsE', 'K3y!', 'xA1', 'SqLt', 'Pr0'];
function getSecret() {
  return _p.join('') + 'SECURE_OFFLINE_V2';
}

function getMachineId() {
  const hostname = os.hostname();
  const platform = os.platform();
  const arch = os.arch();
  const cpus = os.cpus()[0]?.model || 'unknown';
  const totalMem = String(os.totalmem());
  const raw = `${hostname}|${platform}|${arch}|${cpus}|${totalMem}`;
  return crypto.createHash('sha256').update(raw).digest('hex').substring(0, 32).toUpperCase();
}

function machineShort(machineId) {
  return (machineId || '').substring(0, 8).toUpperCase();
}

function sign(payload) {
  return crypto
    .createHmac('sha256', getSecret())
    .update(payload)
    .digest('hex')
    .substring(0, 8)
    .toUpperCase();
}

/**
 * Generate a license key (used by License Generator tool)
 * @param {string} machineId - full 32-char machine id
 * @param {'PERM'|'YEAR'} type
 * @param {number} [years=1] - for YEAR type
 */
function generateLicense(machineId, type = 'PERM', years = 1) {
  const mid = machineShort(machineId);
  if (!mid || mid.length < 8) throw new Error('Invalid Machine ID');

  let expiryPart = 'PERM';
  if (type === 'YEAR') {
    const d = new Date();
    d.setFullYear(d.getFullYear() + years);
    expiryPart = d.toISOString().slice(0, 10).replace(/-/g, ''); // YYYYMMDD
  }

  const payload = `AGRI|${type}|${mid}|${expiryPart}`;
  const sig = sign(payload);
  return `AGRI-${type}-${mid}-${expiryPart}-${sig}`;
}

/**
 * Validate license key against current machine
 * @returns {{ valid: boolean, type?: string, expiresAt?: string, message: string }}
 */
function validateLicense(code, machineId) {
  if (!code || typeof code !== 'string') {
    return { valid: false, message: 'كود التفعيل فارغ' };
  }

  const upper = code.trim().toUpperCase().replace(/\s+/g, '');

  // Expected: AGRI-TYPE-MACHINE8-EXPIRY-SIGNATURE
  const parts = upper.split('-');
  if (parts.length !== 5 || parts[0] !== 'AGRI') {
    return { valid: false, message: 'صيغة كود التفعيل غير صحيحة' };
  }

  const [, type, mid, expiryPart, sig] = parts;

  if (type !== 'PERM' && type !== 'YEAR') {
    return { valid: false, message: 'نوع الترخيص غير معروف' };
  }

  const expectedMid = machineShort(machineId);
  if (mid !== expectedMid) {
    return {
      valid: false,
      message: 'الكود غير مخصص لهذا الجهاز. تأكد من إرسال Machine ID الصحيح.'
    };
  }

  const payload = `AGRI|${type}|${mid}|${expiryPart}`;
  const expectedSig = sign(payload);
  if (sig !== expectedSig) {
    return { valid: false, message: 'التوقيع غير صالح — كود مزور أو تالف' };
  }

  if (type === 'PERM') {
    return { valid: true, type: 'permanent', message: 'ترخيص دائم صالح' };
  }

  // YEAR: expiryPart is YYYYMMDD
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

/**
 * Check if stored license is still valid (for app startup)
 */
function isStoredLicenseValid(license, currentMachineId) {
  if (!license || !license.activated) return false;

  // Machine binding
  if (license.machineId && license.machineId !== currentMachineId) {
    return false;
  }

  if (license.type === 'permanent') return true;

  if (license.type === 'yearly' && license.expiresAt) {
    return new Date(license.expiresAt) > new Date();
  }

  return false;
}

module.exports = {
  getMachineId,
  generateLicense,
  validateLicense,
  isStoredLicenseValid,
  machineShort
};
