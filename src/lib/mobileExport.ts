/**
 * تصدير ملف (نسخة احتياطية JSON) على الهاتف
 * ==============================================
 * أسلوب "<a download>" غير موثوق داخل WebView أندرويد. البديل الرسمي
 * والموثوق في Capacitor: كتابة الملف فعلياً عبر Filesystem، ثم فتح قائمة
 * "مشاركة" أندرويد الأصلية ليختار المستخدم أين يحفظه.
 */
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

export async function exportBackupMobile(
  jsonStr: string,
  filename: string
): Promise<{ success: boolean; message?: string }> {
  try {
    const result = await Filesystem.writeFile({
      path: filename,
      data: jsonStr,
      directory: Directory.Documents,
      encoding: Encoding.UTF8
    });

    await Share.share({
      title: 'نسخة احتياطية — Agri Plus',
      text: 'نسخة احتياطية من بيانات البرنامج',
      url: result.uri,
      dialogTitle: 'احفظ أو شارك النسخة الاحتياطية'
    });

    return { success: true };
  } catch (e: any) {
    return { success: false, message: e?.message || 'خطأ غير معروف أثناء التصدير' };
  }
}

/**
 * نسخة احتياطية تلقائية يومية صامتة — بلا أي تدخل من المستخدم، بخلاف
 * exportBackupMobile أعلاه الذي يفتح قائمة المشاركة في كل مرة. تُحفَظ داخل
 * مجلد فرعي ثابت وسهل الوصول (Documents/AgriPlus-Backups)، ويُحتفَظ فقط
 * بآخر 14 نسخة (نفس سياسة النسخ الاحتياطي التلقائي في نسخة سطح المكتب) حتى
 * لا تتراكم الملفات بلا حدود.
 *
 * ⚠️ حدود حقيقية يجب معرفتها: أندرويد لا يسمح لأي تطبيق باختيار مجلد عشوائي
 * مرة واحدة ثم الكتابة فيه لاحقاً تلقائياً بدون تدخل المستخدم في كل مرة —
 * هذا قيد أمني من النظام نفسه. لذلك هذا الموقع الثابت هو الحل العملي
 * الموثوق؛ للتصدير اليدوي إلى أي مكان تختاره، استخدم exportBackupMobile
 * (زر "تصدير JSON" في الإعدادات) الذي يفتح لك قائمة الاختيار في كل مرة.
 */
export async function autoBackupMobileIfNeeded(jsonStr: string, todayStr: string): Promise<boolean> {
  try {
    const filename = `AgriPlus-Backups/backup-${todayStr}.json`;
    await Filesystem.writeFile({
      path: filename,
      data: jsonStr,
      directory: Directory.Documents,
      encoding: Encoding.UTF8,
      recursive: true
    });

    // تنظيف: احتفظ فقط بآخر 14 نسخة
    try {
      const list = await Filesystem.readdir({ path: 'AgriPlus-Backups', directory: Directory.Documents });
      const backups = list.files
        .filter(f => f.name.startsWith('backup-') && f.name.endsWith('.json'))
        .sort((a, b) => a.name.localeCompare(b.name)); // الأقدم أولاً بحكم صيغة التاريخ YYYY-MM-DD
      const excess = backups.length - 14;
      if (excess > 0) {
        for (const old of backups.slice(0, excess)) {
          await Filesystem.deleteFile({ path: `AgriPlus-Backups/${old.name}`, directory: Directory.Documents });
        }
      }
    } catch {
      // تجاهل أخطاء التنظيف — ليست حرجة، النسخة الجديدة نفسها نجحت بالفعل
    }

    return true;
  } catch {
    return false;
  }
}
