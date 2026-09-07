/**
 * معرّف جهاز ثابت لنسخة الهاتف — مكافئ getMachineId() في نسخة سطح المكتب
 * =========================================================================
 * على سطح المكتب: بصمة مبنية من (اسم الجهاز + المعالج + الذاكرة...).
 * على الهاتف: لا يوجد مكافئ مباشر لهذه المعلومات عبر الويب — البديل الرسمي
 * والموثوق في Capacitor هو `@capacitor/device`'s `Device.getId()`، الذي
 * يُرجع معرّفاً ثابتاً محفوظاً بشكل دائم طالما لم يُعِد المستخدم تثبيت
 * التطبيق من الصفر أو يُصفّر الجهاز بالكامل (نفس درجة "الثبات النسبي" التي
 * تملكها بصمة الجهاز على سطح المكتب أصلاً — وليست أضعف منها).
 */
import { Device } from '@capacitor/device';

export async function getMobileDeviceId(): Promise<string> {
  const info = await Device.getId();
  // نُمرّر المعرّف الخام عبر نفس تحويل SHA-256 المستخدَم على سطح المكتب،
  // حتى يكون الشكل النهائي (32 حرفاً hex) متطابقاً تماماً بين المنصتين
  const encoder = new TextEncoder();
  const data = encoder.encode(info.identifier);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hex.substring(0, 32).toUpperCase();
}
