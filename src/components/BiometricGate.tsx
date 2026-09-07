import { useState, useEffect, useRef, type ReactNode } from 'react';
import { Fingerprint, Loader2, AlertTriangle } from 'lucide-react';
import { isCapacitorNative } from '../db/capacitorDb';
import { isBiometricAvailable, verifyBiometric } from '../lib/biometricLock';
import { useApp } from '../store/AppContext';

/**
 * يُغلِّف كامل التطبيق. على الهاتف فقط، وفقط إن كانت الميزة مُفعَّلة من
 * الإعدادات: يعرض فوراً (بدون أي ضغط زر من المستخدم — لهذا هي "سريعة جداً")
 * موجّه البصمة الأصلي لأندرويد قبل السماح برؤية أي بيانات. على سطح المكتب
 * أو إن كانت الميزة معطَّلة: يمرّر المحتوى مباشرة بدون أي تأخير.
 */
export default function BiometricGate({ children }: { children: ReactNode }) {
  const { data, storageReady } = useApp();
  const [unlocked, setUnlocked] = useState(false);
  const [checking, setChecking] = useState(true);
  const [failed, setFailed] = useState(false);
  const attemptedRef = useRef(false);

  const enabled = isCapacitorNative() && data.settings?.biometricLockEnabled === true;

  useEffect(() => {
    if (!storageReady) return; // ننتظر معرفة إعدادات المستخدم الفعلية أولاً
    if (!enabled) {
      setUnlocked(true);
      setChecking(false);
      return;
    }
    if (attemptedRef.current) return;
    attemptedRef.current = true;

    (async () => {
      const available = await isBiometricAvailable();
      if (!available) {
        // لا يوجد بصمة مسجَّلة على الجهاز أصلاً — لا داعي لحبس المستخدم خارج
        // بياناته بسبب إعداد لا يستطيع تلبيته، نسمح بالدخول مباشرة
        setUnlocked(true);
        setChecking(false);
        return;
      }
      const ok = await verifyBiometric();
      setChecking(false);
      if (ok) setUnlocked(true);
      else setFailed(true);
    })();
  }, [storageReady, enabled]);

  const retry = async () => {
    setFailed(false);
    setChecking(true);
    const ok = await verifyBiometric();
    setChecking(false);
    if (ok) setUnlocked(true);
    else setFailed(true);
  };

  if (unlocked) return <>{children}</>;

  return (
    <div className="fixed inset-0 z-[9999] bg-primary flex flex-col items-center justify-center gap-5 text-white px-6">
      <div className="w-20 h-20 rounded-3xl bg-white/10 flex items-center justify-center">
        {checking ? <Loader2 className="w-9 h-9 animate-spin" /> : failed ? <AlertTriangle className="w-9 h-9 text-amber-400" /> : <Fingerprint className="w-9 h-9" />}
      </div>
      <div className="text-center">
        <h2 className="font-bold text-lg">Agri Plus</h2>
        <p className="text-sm text-white/60 mt-1">
          {checking ? 'جارٍ التحقق من البصمة...' : failed ? 'لم يتم التحقق — حاول مرة أخرى' : 'بانتظار البصمة'}
        </p>
      </div>
      {failed && (
        <button onClick={retry} className="bg-secondary text-white px-6 py-2.5 rounded-xl text-sm font-medium">
          إعادة المحاولة
        </button>
      )}
    </div>
  );
}
