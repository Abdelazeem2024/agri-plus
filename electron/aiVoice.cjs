/**
 * إدارة ملفات الإدخال الصوتي (whisper.cpp)
 * ==========================================
 * مسؤول عن: تحميل ملف النموذج تلقائياً من داخل البرنامج (75 ميجا، مجاني
 * ومفتوح المصدر بالكامل من Hugging Face الرسمي)، والتحقق من وجود الملف
 * التنفيذي whisper-cli.exe (يُوضَع يدوياً مرة واحدة فقط — راجع الشرح في
 * اقرأني-أولاً.md لسبب عدم أتمتة هذه الخطوة تحديداً).
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

// مصدر رسمي مباشر من Hugging Face (نفس الجهة الناشرة لمشروع whisper.cpp نفسه)
const MODEL_URL = 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-tiny.bin';
const MODEL_SIZE_APPROX = 75 * 1024 * 1024; // للعرض التقريبي فقط قبل بدء التحميل

function getVoiceDir() {
  const dir = path.join(app.getPath('userData'), 'ai-voice');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function getModelPath() {
  return path.join(getVoiceDir(), 'ggml-tiny.bin');
}

function getBinaryPath() {
  // المستخدم يضع whisper-cli.exe هنا يدوياً مرة واحدة (تعليمات كاملة في الواجهة)
  return path.join(getVoiceDir(), 'whisper-cli.exe');
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
