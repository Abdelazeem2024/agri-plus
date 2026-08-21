/**
 * تسجيل صوت من الميكروفون وتحويله مباشرة إلى ملف WAV بالمواصفات التي يتطلبها
 * whisper.cpp (16000Hz، أحادي القناة، 16-bit PCM) — بدون أي حاجة لـ ffmpeg أو
 * أي أداة تحويل خارجية، فك التشفير يتم بالكامل هنا بكود JS بسيط.
 */

let audioContext: AudioContext | null = null;
let mediaStream: MediaStream | null = null;
let sourceNode: MediaStreamAudioSourceNode | null = null;
let processorNode: ScriptProcessorNode | null = null;
let capturedChunks: Float32Array[] = [];
let actualSampleRate = 16000;

export async function startRecording(): Promise<void> {
  capturedChunks = [];
  mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });

  // نحاول فتح AudioContext مباشرة على 16000Hz (ما يحتاجه whisper.cpp)؛ إن رفض
  // المتصفح تحديد معدل العينات هذا (بعض الأجهزة)، نأخذ المعدل الفعلي ونعيد
  // أخذ العينات لاحقاً (resample) عند البناء النهائي للملف
  audioContext = new AudioContext({ sampleRate: 16000 });
  actualSampleRate = audioContext.sampleRate;

  sourceNode = audioContext.createMediaStreamSource(mediaStream);
  processorNode = audioContext.createScriptProcessor(4096, 1, 1);

  processorNode.onaudioprocess = (e) => {
    const input = e.inputBuffer.getChannelData(0);
    capturedChunks.push(new Float32Array(input));
  };

  sourceNode.connect(processorNode);
  processorNode.connect(audioContext.destination);
}

/** يعيد أخذ العينات من أي معدل إلى 16000Hz بطريقة بسيطة (Linear interpolation) */
function resampleTo16k(samples: Float32Array, fromRate: number): Float32Array {
  if (fromRate === 16000) return samples;
  const ratio = fromRate / 16000;
  const newLength = Math.round(samples.length / ratio);
  const result = new Float32Array(newLength);
  for (let i = 0; i < newLength; i++) {
    const srcIndex = i * ratio;
    const i0 = Math.floor(srcIndex);
    const i1 = Math.min(i0 + 1, samples.length - 1);
    const frac = srcIndex - i0;
    result[i] = samples[i0] * (1 - frac) + samples[i1] * frac;
  }
  return result;
}

/** يبني ملف WAV صحيح البنية (RIFF/WAVE، 16-bit PCM، أحادي) من عينات Float32 */
function encodeWav(samples: Float32Array, sampleRate: number): ArrayBuffer {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);

  const writeStr = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
  };

  writeStr(0, 'RIFF');
  view.setUint32(4, 36 + samples.length * 2, true);
  writeStr(8, 'WAVE');
  writeStr(12, 'fmt ');
  view.setUint32(16, 16, true);       // حجم كتلة fmt
  view.setUint16(20, 1, true);        // PCM = 1
  view.setUint16(22, 1, true);        // قناة واحدة (أحادي)
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true); // byte rate
  view.setUint16(32, 2, true);        // block align
  view.setUint16(34, 16, true);       // bits per sample
  writeStr(36, 'data');
  view.setUint32(40, samples.length * 2, true);

  let offset = 44;
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    offset += 2;
  }

  return buffer;
}

/** يوقف التسجيل ويُرجع ملف WAV جاهزاً (Base64) لإرساله عبر IPC لعملية Electron الرئيسية */
export async function stopRecording(): Promise<string> {
  if (processorNode) { processorNode.disconnect(); processorNode = null; }
  if (sourceNode) { sourceNode.disconnect(); sourceNode = null; }
  if (mediaStream) { mediaStream.getTracks().forEach(t => t.stop()); mediaStream = null; }

  const rate = audioContext?.sampleRate || actualSampleRate;
  if (audioContext) { await audioContext.close(); audioContext = null; }

  // دمج كل القطع الملتقطة في مصفوفة واحدة
  const totalLength = capturedChunks.reduce((s, c) => s + c.length, 0);
  const merged = new Float32Array(totalLength);
  let pos = 0;
  for (const chunk of capturedChunks) { merged.set(chunk, pos); pos += chunk.length; }
  capturedChunks = [];

  const resampled = resampleTo16k(merged, rate);
  const wavBuffer = encodeWav(resampled, 16000);

  // تحويل لـ Base64 لإرساله عبر IPC (contextBridge لا يمرر ArrayBuffer مباشرة بأمان دائماً)
  const bytes = new Uint8Array(wavBuffer);
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

export function isRecordingSupported(): boolean {
  return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia && window.AudioContext);
}
