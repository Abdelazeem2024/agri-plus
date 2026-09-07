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
