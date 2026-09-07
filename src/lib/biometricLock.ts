/**
 * قفل بصمة لفتح التطبيق (نسخة الهاتف فقط)
 * ==========================================
 * تحقق فوري وسريع عبر بصمة الإصبع/الوجه المسجَّلة أصلاً على الجهاز نفسه —
 * لا تخزين ولا كلمات مرور من عندنا، فقط "هل صاحب الجهاز هو من يحاول الفتح
 * الآن؟" — هذا يجعله سريعاً جداً كما طُلب (استدعاء واحد مباشر لنظام
 * التحقق الحيوي المدمج أصلاً في أندرويد، بدون أي شاشة وسيطة من عندنا).
 */
import { NativeBiometric } from '@capgo/capacitor-native-biometric';

export async function isBiometricAvailable(): Promise<boolean> {
  try {
    const result = await NativeBiometric.isAvailable();
    return !!result.isAvailable;
  } catch {
    return false;
  }
}

/** يعرض فوراً موجّه البصمة الأصلي لنظام أندرويد ويُرجع true/false بحسب النجاح */
export async function verifyBiometric(): Promise<boolean> {
  try {
    await NativeBiometric.verifyIdentity({
      reason: 'افتح Agri Plus ببصمتك',
      title: 'Agri Plus',
      subtitle: 'تحقق من هويتك للمتابعة',
      description: 'ضع إصبعك على المستشعر'
    });
    return true; // verifyIdentity ينجح (resolve) فقط عند تحقق فعلي ناجح، ويرفض (reject) في أي حالة أخرى
  } catch {
    return false; // فشل التحقق، أو ألغى المستخدم، أو غير مدعوم
  }
}
