/**
 * الإدخال الصوتي على الهاتف — عبر محرك التعرّف على الكلام المدمج في أندرويد
 * =========================================================================
 * هذا نهج مختلف تماماً عن نسخة سطح المكتب (whisper.cpp) لسبب بسيط: ملف
 * whisper-cli.exe مبني لويندوز فقط ولن يعمل على أندرويد إطلاقاً مهما فعلنا.
 * الحل الصحيح على أندرويد: استخدام محرك التعرّف على الكلام **المدمج مجاناً
 * في نظام أندرويد نفسه** (نفس المحرك الذي يستخدمه "مساعد جوجل" وكيبورد
 * جوجل) — لا حاجة لتحميل أي نموذج ضخم، ولا أي خادم خارجي، ويدعم العربية.
 *
 * نستخدم وضع "popup: true" عمداً — يعرض حوار أندرويد الأصلي (نفس الشكل
 * المألوف للمستخدم من تطبيقات أخرى)، وهو يتولى كل واجهة "بدء/إيقاف
 * الاستماع" بنفسه، فلا نحتاج لبناء أي واجهة مخصصة لحالة التسجيل.
 */
import { SpeechRecognition } from '@capacitor-community/speech-recognition';

export async function isSpeechRecognitionAvailable(): Promise<boolean> {
  try {
    const result = await SpeechRecognition.available();
    return !!result.available;
  } catch {
    return false;
  }
}

async function ensurePermission(): Promise<boolean> {
  try {
    const has = await SpeechRecognition.hasPermission();
    if (has.permission) return true;
    const requested = await SpeechRecognition.requestPermission();
    return !!requested.permission;
  } catch {
    return false;
  }
}

/** يفتح حوار الاستماع الأصلي لأندرويد، وينتظر حتى ينتهي المستخدم من الكلام، ثم يُرجع النص */
export async function listenOnce(): Promise<string> {
  const granted = await ensurePermission();
  if (!granted) {
    throw new Error('لم يُسمَح باستخدام الميكروفون — امنح الإذن من إعدادات الجهاز');
  }

  const result: any = await SpeechRecognition.start({
    language: 'ar-EG',
    maxResults: 1,
    prompt: 'تكلم الآن...',
    popup: true,
    partialResults: false
  });

  const text = result?.matches?.[0] || '';
  return text;
}
