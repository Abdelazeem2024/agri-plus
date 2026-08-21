import { useEffect, useState } from 'react';
import { Mic, Download, CheckCircle2, FolderOpen, ExternalLink } from 'lucide-react';
import { appAlert } from '../lib/dialogs';

interface VoiceStatus {
  modelReady: boolean;
  binaryReady: boolean;
  voiceDir: string;
  modelSizeApprox: number;
}

/**
 * قسم مستقل بالكامل لإدارة الإدخال الصوتي — استوردها في Settings.tsx وضعها
 * في أي مكان مناسب داخل الصفحة:
 *
 *   import AIVoiceSettings from '../components/AIVoiceSettings';
 *   ...
 *   <AIVoiceSettings />
 */
export default function AIVoiceSettings() {
  const [status, setStatus] = useState<VoiceStatus | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [progress, setProgress] = useState(0);

  const refresh = () => {
    const api = (window as any).electronAPI;
    if (api?.aiVoiceStatus) api.aiVoiceStatus().then(setStatus);
  };

  useEffect(() => {
    refresh();
    const api = (window as any).electronAPI;
    if (api?.onAiVoiceDownloadProgress) {
      api.onAiVoiceDownloadProgress((received: number, total: number) => {
        setProgress(total > 0 ? Math.min(100, Math.round((received / total) * 100)) : 0);
      });
    }
  }, []);

  if (!(window as any).electronAPI) return null; // لا يظهر هذا القسم إطلاقاً خارج نسخة سطح المكتب

  const handleDownloadModel = async () => {
    const api = (window as any).electronAPI;
    if (!api?.aiVoiceDownloadModel) return;
    setDownloading(true);
    setProgress(0);
    try {
      const res = await api.aiVoiceDownloadModel();
      if (res?.success) {
        appAlert('تم تحميل نموذج الصوت بنجاح.');
      } else {
        appAlert('تعذّر تحميل نموذج الصوت: ' + (res?.error || 'خطأ غير معروف') + '\nتأكد من اتصال الإنترنت وحاول مرة أخرى.');
      }
    } catch (e: any) {
      appAlert('تعذّر تحميل نموذج الصوت: ' + (e?.message || 'خطأ غير معروف'));
    } finally {
      setDownloading(false);
      refresh();
    }
  };

  const handleOpenFolder = () => {
    const api = (window as any).electronAPI;
    if (status?.voiceDir && api?.openPath) api.openPath(status.voiceDir);
  };

  const handleOpenReleasesPage = () => {
    const api = (window as any).electronAPI;
    if (api?.openExternal) api.openExternal('https://github.com/ggml-org/whisper.cpp/releases');
  };

  const voiceReady = !!status?.modelReady && !!status?.binaryReady;

  return (
    <div className="bg-surface rounded-2xl p-6 shadow-soft border border-slate-100 dark:border-slate-700 space-y-4">
      <h3 className="font-bold flex items-center gap-2">
        <Mic className="w-5 h-5 text-secondary" /> الإدخال الصوتي للمساعد الذكي
      </h3>

      <div className={`flex items-center gap-2 text-sm px-3 py-2 rounded-xl ${voiceReady ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300' : 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300'}`}>
        {voiceReady ? <CheckCircle2 className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
        {voiceReady ? 'الإدخال الصوتي جاهز ومفعَّل بالكامل' : 'الإدخال الصوتي غير مفعَّل بعد — خطوتان لمرة واحدة أدناه'}
      </div>

      {/* الخطوة 1: النموذج — تلقائي بالكامل */}
      <div className="border border-slate-200 dark:border-slate-700 rounded-xl p-4 space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-sm font-bold">
            1) نموذج فهم الصوت (75 ميجا تقريباً)
            {status?.modelReady && <span className="text-emerald-600 dark:text-emerald-400 mr-2 text-xs">✓ مُحمَّل</span>}
          </p>
          {!status?.modelReady && (
            <button
              onClick={handleDownloadModel}
              disabled={downloading}
              className="flex items-center gap-2 bg-secondary text-white px-4 py-2 rounded-xl text-xs hover:bg-emerald-600 disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" /> {downloading ? `جارٍ التحميل... ${progress}%` : 'تحميل تلقائي الآن'}
            </button>
          )}
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          يُحمَّل مباشرة من داخل البرنامج من المصدر الرسمي المجاني (Hugging Face) — يحتاج اتصال إنترنت لمرة واحدة فقط، ثم يعمل بلا إنترنت تماماً بعدها.
        </p>
        {downloading && (
          <div className="w-full h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
            <div className="h-full bg-secondary transition-all" style={{ width: `${progress}%` }} />
          </div>
        )}
      </div>

      {/* الخطوة 2: الملف التنفيذي — يدوي لمرة واحدة (سبب ذلك موضّح) */}
      <div className="border border-slate-200 dark:border-slate-700 rounded-xl p-4 space-y-2">
        <p className="text-sm font-bold">
          2) برنامج التشغيل (whisper-cli.exe)
          {status?.binaryReady && <span className="text-emerald-600 dark:text-emerald-400 mr-2 text-xs">✓ موجود</span>}
        </p>
        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
          خطوة يدوية بسيطة لمرة واحدة فقط (لأن هذا الملف يصدر كأرشيف مضغوط يتغيّر اسمه مع كل إصدار، فالتحميل التلقائي غير مضمون النجاح دائماً):
        </p>
        <ol className="text-xs text-slate-500 dark:text-slate-400 list-decimal mr-4 space-y-1">
          <li>اضغط "فتح صفحة التحميل" أدناه.</li>
          <li>حمّل ملف <code className="bg-slate-100 dark:bg-slate-800 px-1 rounded">whisper-bin-x64.zip</code> (آخر إصدار لويندوز).</li>
          <li>فك الضغط، وانسخ ملف <code className="bg-slate-100 dark:bg-slate-800 px-1 rounded">whisper-cli.exe</code> فقط إلى المجلد الذي يفتحه زر "فتح مجلد الصوت" أدناه.</li>
        </ol>
        <div className="flex gap-2 pt-1">
          <button onClick={handleOpenReleasesPage} className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-700 px-3 py-2 rounded-xl text-xs hover:bg-slate-200 dark:hover:bg-slate-600">
            <ExternalLink className="w-3.5 h-3.5" /> فتح صفحة التحميل
          </button>
          <button onClick={handleOpenFolder} className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-700 px-3 py-2 rounded-xl text-xs hover:bg-slate-200 dark:hover:bg-slate-600">
            <FolderOpen className="w-3.5 h-3.5" /> فتح مجلد الصوت
          </button>
          <button onClick={refresh} className="text-xs text-secondary hover:underline px-2">تحديث الحالة</button>
        </div>
      </div>
    </div>
  );
}
