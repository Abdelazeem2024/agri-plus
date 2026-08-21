/**
 * إدارة ملفات الإدخال الصوتي (whisper.cpp)
 * ==========================================
 * الملف التنفيذي وملفاته المرافقة (whisper-cli.exe + ggml.dll + whisper.dll +
 * ggml-base.dll) مُضمَّنة الآن مباشرة داخل حزمة التثبيت نفسها — كل عميل
 * يحصل عليها تلقائياً بدون أي خطوة يدوية. المتبقي فقط هو تحميل ملف النموذج
 * (75 ميجا، من Hugging Face الرسمي) عند أول استخدام للمساعد الصوتي.
 *
 * كل شيء هنا محلي بالكامل بعد التحميل الأول — لا اتصال إنترنت لاحقاً أثناء
 * الاستخدام الفعلي للمساعد الذكي.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const https = require('https');
const { execFile } = require('child_process');
const { app } = require('electron');

// المصدر الرسمي المباشر لملف النموذج (Hugging Face — نفس ناشر مشروع whisper.cpp)
const MODEL_URL = 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-tiny.bin';
const MODEL_SIZE_APPROX = 75 * 1024 * 1024;

function getVoiceDir() {
  const dir = path.join(app.getPath('userData'), 'ai-voice');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function getModelPath() {
  return path.join(getVoiceDir(), 'ggml-tiny.bin');
}

/**
 * الملف التنفيذي وملفات الـ DLL المرافقة له (ggml.dll، whisper.dll، ggml-base.dll)
 * أصبحت الآن مُضمَّنة مباشرة داخل حزمة التثبيت نفسها (راجع extraResources في
 * package.json ومجلد build/whisper-bin) — أي عميل يحصل عليها تلقائياً عند
 * التثبيت، بدون أي خطوة يدوية. لم تعد تُوضَع في مجلد بيانات المستخدم كما في
 * التصميم القديم.
 */
function getBinaryDir() {
  if (app.isPackaged) {
    // في النسخة المُثبَّتة فعلياً لدى العميل: داخل مجلد resources بجوار التطبيق
    return path.join(process.resourcesPath, 'whisper-bin');
  }
  // أثناء التطوير المحلي (قبل التغليف): من مجلد المشروع مباشرة
  return path.join(__dirname, '..', 'build', 'whisper-bin');
}

function getBinaryPath() {
  return path.join(getBinaryDir(), 'whisper-cli.exe');
}

/** يتحقق مما إذا كانت كل مكوّنات الصوت جاهزة للعمل فعلياً */
function isVoiceReady() {
  return fs.existsSync(getModelPath()) && fs.existsSync(getBinaryPath());
}

function getStatus() {
  return {
    modelReady: fs.existsSync(getModelPath()),
    binaryReady: fs.existsSync(getBinaryPath()),
    voiceDir: getVoiceDir(),
    modelSizeApprox: MODEL_SIZE_APPROX
  };
}

/**
 * يحمّل ملف النموذج فعلياً من Hugging Face مع تقارير تقدّم حية عبر onProgress.
 * يتبع أي إعادة توجيه (Hugging Face يُحوِّل الرابط لخادم تخزين فعلي).
 */
function downloadModel(onProgress) {
  return new Promise((resolve, reject) => {
    const dest = getModelPath();
    const tmp = dest + '.part';

    function request(url, redirectsLeft) {
      https.get(url, res => {
        if ([301, 302, 303, 307, 308].includes(res.statusCode) && res.headers.location && redirectsLeft > 0) {
          request(res.headers.location, redirectsLeft - 1);
          return;
        }
        if (res.statusCode !== 200) {
          reject(new Error(`فشل التحميل — رمز الاستجابة: ${res.statusCode}`));
          return;
        }
        const total = parseInt(res.headers['content-length'] || '0', 10) || MODEL_SIZE_APPROX;
        let received = 0;
        const fileStream = fs.createWriteStream(tmp);
        res.on('data', chunk => {
          received += chunk.length;
          if (onProgress) onProgress(received, total);
        });
        res.pipe(fileStream);
        fileStream.on('finish', () => {
          fileStream.close(() => {
            fs.renameSync(tmp, dest); // تبديل ذرّي بعد اكتمال التحميل بنجاح فقط
            resolve({ success: true, path: dest });
          });
        });
        fileStream.on('error', err => { try { fs.unlinkSync(tmp); } catch { /* ignore */ } reject(err); });
      }).on('error', err => { try { fs.unlinkSync(tmp); } catch { /* ignore */ } reject(err); });
    }

    request(MODEL_URL, 5);
  });
}

/**
 * يحوّل صوتاً (WAV بصيغة base64، 16kHz/أحادي/16-bit — راجع src/lib/audioRecorder.ts
 * في الواجهة، فهو من يبني هذا الملف بهذه المواصفات بالضبط) إلى نص عربي عبر
 * استدعاء whisper-cli.exe محلياً. لا يُرسَل أي صوت لأي خادم خارجي إطلاقاً —
 * التحويل بالكامل يحدث على جهاز المستخدم فقط.
 */
function transcribeAudio(wavBase64) {
  return new Promise((resolve, reject) => {
    if (!isVoiceReady()) {
      reject(new Error('ملفات الصوت غير مكتملة بعد — راجع قسم الإدخال الصوتي في الإعدادات'));
      return;
    }
    const dir = getVoiceDir();
    const tmpId = Date.now() + '-' + Math.random().toString(36).slice(2, 8);
    const wavPath = path.join(dir, `rec-${tmpId}.wav`);
    const outBase = path.join(dir, `rec-${tmpId}`);
    const txtPath = outBase + '.txt';

    try {
      fs.writeFileSync(wavPath, Buffer.from(wavBase64, 'base64'));
    } catch (e) {
      reject(e);
      return;
    }

    const args = ['-m', getModelPath(), '-f', wavPath, '-otxt', '-of', outBase, '-l', 'ar', '-nt'];

    execFile(getBinaryPath(), args, { timeout: 60000 }, (error) => {
      const cleanup = () => {
        try { fs.unlinkSync(wavPath); } catch { /* ignore */ }
        try { fs.unlinkSync(txtPath); } catch { /* ignore */ }
      };
      if (error) {
        cleanup();
        reject(new Error('تعذّر تشغيل محرك التعرّف على الصوت: ' + error.message));
        return;
      }
      try {
        const text = fs.readFileSync(txtPath, 'utf8').trim();
        cleanup();
        resolve(text);
      } catch (e) {
        cleanup();
        reject(new Error('تعذّر قراءة نتيجة التفريغ الصوتي'));
      }
    });
  });
}

module.exports = { getVoiceDir, getModelPath, getBinaryPath, isVoiceReady, getStatus, downloadModel, transcribeAudio };
