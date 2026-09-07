import { useState, useEffect } from 'react';
import { useApp } from '../store/AppContext';
import { exportToJSON, importFromJSON, getStorageMode } from '../db/storage';
import { isCapacitorNative } from '../db/capacitorDb';
import { exportBackupMobile } from '../lib/mobileExport';
import { getMobileDeviceId } from '../lib/mobileDeviceId';
import { FilePicker } from '@capawesome/capacitor-file-picker';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Download, Upload, Save, Key, Image as ImageIcon, Trash2 } from 'lucide-react';
import { appAlert, appConfirm } from '../lib/dialogs';
import AIVoiceSettings from '../components/AIVoiceSettings';

export default function Settings() {
  const { data, updateSettings, clearAllData, activateLicenseSecure, trialDaysLeft, licenseValid } = useApp();
  const [form, setForm] = useState(data.settings);
  const [machineId, setMachineId] = useState('');
  const [licenseCode, setLicenseCode] = useState('');
  const [wipePassword, setWipePassword] = useState('');
  const [msg, setMsg] = useState('');
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    if (window.electronAPI) {
      window.electronAPI.getMachineId().then(setMachineId);
    } else if (isCapacitorNative()) {
      // نسخة الهاتف: معرّف جهاز ثابت حقيقي، وليس رقماً عشوائياً كوضع
      // المعاينة العادية في المتصفح — هذا هو المعرّف الذي يُعطيه صاحب المحل
      // للبائع لتوليد كود التفعيل الخاص بجهازه
      getMobileDeviceId().then(setMachineId);
    } else {
      setMachineId('WEB-DEMO-' + Math.random().toString(36).slice(2, 10).toUpperCase());
    }
  }, []);

  const handleSave = () => {
    updateSettings({ name: form.name, phone: form.phone, address: form.address, currency: form.currency, logo: form.logo });
    setMsg('تم حفظ الإعدادات');
    setTimeout(() => setMsg(''), 2000);
  };

  const handlePickLogo = async () => {
    if (isCapacitorNative()) {
      // على الهاتف: نستخدم مكوّن الكاميرا الرسمي والمُختبَر جيداً (وليس
      // <input type="file"> العادي، الذي له نفس مشاكل الموثوقية التي
      // واجهناها مع استيراد ملفات JSON على WebView أندرويد)
      try {
        const photo = await Camera.getPhoto({
          source: CameraSource.Photos, // من المعرض مباشرة، وليس فتح الكاميرا
          resultType: CameraResultType.DataUrl,
          quality: 80,
          width: 400,
          height: 400
        });
        if (photo.dataUrl) {
          setForm({ ...form, logo: photo.dataUrl });
        }
      } catch (e: any) {
        if (e?.message?.toLowerCase().includes('cancel')) return; // المستخدم ألغى — ليس خطأً
        appAlert('تعذّر اختيار الشعار: ' + (e?.message || 'خطأ غير معروف'));
      }
      return;
    }
    // سطح المكتب: عنصر اختيار ملف عادي (يعمل بشكل طبيعي تماماً هنا)
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => setForm({ ...form, logo: reader.result as string });
      reader.readAsDataURL(file);
    };
    input.click();
  };

  const handleRemoveLogo = () => setForm({ ...form, logo: undefined });

  const handleExport = async () => {
    const json = exportToJSON();
    const filename = `agri-plus-backup-${new Date().toISOString().slice(0, 10)}.json`;

    if (isCapacitorNative()) {
      // على الهاتف: أسلوب "<a download>" غير موثوق داخل WebView أندرويد —
      // نستخدم بدلاً منه كتابة ملف حقيقية + قائمة المشاركة الأصلية لأندرويد
      setExporting(true);
      try {
        const res = await exportBackupMobile(json, filename);
        if (!res.success) {
          appAlert('تعذّر تصدير النسخة الاحتياطية: ' + (res.message || 'خطأ غير معروف'));
        }
      } finally {
        setExporting(false);
      }
      return;
    }

    // سطح المكتب / المتصفح: نفس الأسلوب المعتاد بدون أي تغيير
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isCapacitorNative()) return; // نسخة الهاتف تستخدم handleImportMobile بدلاً من هذا (زر منفصل)
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const result = importFromJSON(reader.result as string);
      if (result.success) {
        appAlert(`تم الاستيراد بنجاح\nعملاء: ${result.summary?.customers}\nأصناف: ${result.summary?.products}`);
        window.location.reload();
      } else {
        appAlert(result.message);
      }
    };
    reader.readAsText(file);
  };

  const handleImportMobile = async () => {
    // على الهاتف: <input type="file"> غير موثوق داخل WebView أندرويد (قد لا
    // يفتح أي شيء إطلاقاً على بعض الأجهزة — مشكلة موثَّقة رسمياً في مستودع
    // Capacitor). البديل الموثوق: مكوّن اختيار ملفات مخصص لأندرويد/iOS
    try {
      const result = await FilePicker.pickFiles({ types: ['application/json'], readData: true, limit: 1 });
      const file = result.files?.[0];
      if (!file?.data) {
        appAlert('لم يتم اختيار أي ملف');
        return;
      }
      // data تصل كـ Base64 (بسبب readData: true) — نفكّها لنص JSON عادي UTF-8
      // بأمان (لأن الملف يحتوي نصاً عربياً) عبر تحويل البايتات الخام أولاً
      const binary = atob(file.data);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      const jsonStr = new TextDecoder('utf-8').decode(bytes);
      const importResult = importFromJSON(jsonStr);
      if (importResult.success) {
        appAlert(`تم الاستيراد بنجاح\nعملاء: ${importResult.summary?.customers}\nأصناف: ${importResult.summary?.products}`);
        window.location.reload();
      } else {
        appAlert(importResult.message);
      }
    } catch (e: any) {
      if (e?.message?.includes('cancel')) return; // المستخدم ألغى الاختيار — ليس خطأً
      appAlert('تعذّر استيراد الملف: ' + (e?.message || 'خطأ غير معروف'));
    }
  };

  const handleActivate = async () => {
    if (!licenseCode.trim()) {
      appAlert('أدخل كود التفعيل');
      return;
    }
    const result = await activateLicenseSecure(licenseCode, machineId);
    if (result.ok) {
      setMsg(result.message || 'تم التفعيل بنجاح!');
      setLicenseCode('');
    } else {
      appAlert(result.message || 'كود التفعيل غير صحيح');
    }
  };

  return (
    <div className="space-y-8 max-w-2xl">
      <div>
        <h2 className="text-2xl font-bold">الإعدادات</h2>
        <p className="text-sm text-slate-500">بيانات الشركة والنسخ الاحتياطي والترخيص</p>
        <p className="text-xs mt-1 text-slate-400">
          محرك التخزين: {
            getStorageMode() === 'sqlite' ? 'SQLite (قاعدة بيانات احترافية)'
            : getStorageMode() === 'capacitor-sqlite' ? 'SQLite (قاعدة بيانات احترافية على الجهاز)'
            : 'localStorage (وضع المتصفح)'
          }
        </p>
      </div>

      {msg && <div className="bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300 px-4 py-2 rounded-xl text-sm">{msg}</div>}

      {/* Company */}
      <div className="bg-surface rounded-2xl p-6 shadow-soft border border-slate-100 dark:border-slate-700 space-y-4">
        <h3 className="font-bold">بيانات الشركة</h3>

        <div>
          <label className="text-xs text-slate-500 block mb-2">شعار المحل (يظهر أعلى كل التقارير)</label>
          <div className="flex items-center gap-3">
            {form.logo ? (
              <img src={form.logo} alt="الشعار" className="w-16 h-16 rounded-xl object-contain border border-slate-200 dark:border-slate-600 bg-white" />
            ) : (
              <div className="w-16 h-16 rounded-xl border border-dashed border-slate-300 dark:border-slate-600 flex items-center justify-center text-slate-300">
                <ImageIcon className="w-6 h-6" />
              </div>
            )}
            <button onClick={handlePickLogo} type="button" className="flex items-center gap-2 bg-slate-100 dark:bg-slate-700 px-4 py-2 rounded-xl text-sm hover:bg-slate-200 dark:hover:bg-slate-600">
              <ImageIcon className="w-4 h-4" /> {form.logo ? 'تغيير الشعار' : 'اختيار شعار'}
            </button>
            {form.logo && (
              <button onClick={handleRemoveLogo} type="button" className="flex items-center gap-2 text-red-500 px-3 py-2 rounded-xl text-sm hover:bg-red-50 dark:hover:bg-red-900/20">
                <Trash2 className="w-4 h-4" /> إزالة
              </button>
            )}
          </div>
        </div>

        <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="اسم الشركة (يظهر في التقارير)"
          className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-transparent outline-none focus:ring-2 focus:ring-secondary" />
        <input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="رقم الهاتف (يظهر في التقارير)"
          className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-transparent outline-none focus:ring-2 focus:ring-secondary" />
        <input value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} placeholder="العنوان"
          className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-transparent outline-none focus:ring-2 focus:ring-secondary" />

        <button onClick={handleSave} className="flex items-center gap-2 bg-secondary text-white px-5 py-2.5 rounded-xl font-medium hover:bg-emerald-600">
          <Save className="w-4 h-4" /> حفظ الإعدادات
        </button>
      </div>

      {/* Backup */}
      <div className="bg-surface rounded-2xl p-6 shadow-soft border border-slate-100 dark:border-slate-700 space-y-4">
        <h3 className="font-bold">النسخ الاحتياطي والاستيراد</h3>
        <div className="flex flex-wrap gap-3">
          <button onClick={handleExport} disabled={exporting} className="flex items-center gap-2 bg-slate-800 text-white px-4 py-2.5 rounded-xl text-sm hover:bg-slate-700 disabled:opacity-50">
            <Download className="w-4 h-4" /> تصدير JSON
          </button>
          {isCapacitorNative() ? (
            <button onClick={handleImportMobile} className="flex items-center gap-2 bg-slate-100 dark:bg-slate-700 px-4 py-2.5 rounded-xl text-sm hover:bg-slate-200 dark:hover:bg-slate-600">
              <Upload className="w-4 h-4" /> استيراد JSON
            </button>
          ) : (
            <label className="flex items-center gap-2 bg-slate-100 dark:bg-slate-700 px-4 py-2.5 rounded-xl text-sm cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-600">
              <Upload className="w-4 h-4" /> استيراد JSON
              <input type="file" accept=".json" onChange={handleImport} className="hidden" />
            </label>
          )}
        </div>

        {isCapacitorNative() && (
          <label className="flex items-center justify-between gap-3 pt-2 border-t border-slate-100 dark:border-slate-700 cursor-pointer">
            <div>
              <p className="text-sm font-medium">نسخة احتياطية تلقائية يومية</p>
              <p className="text-xs text-slate-400 mt-0.5">تُحفَظ صامتة كل يوم داخل مجلد المستندات، ويُحتفَظ بآخر 14 نسخة فقط</p>
            </div>
            <input
              type="checkbox"
              checked={data.settings?.mobileAutoBackupEnabled !== false}
              onChange={e => updateSettings({ mobileAutoBackupEnabled: e.target.checked })}
              className="w-5 h-5 accent-secondary shrink-0"
            />
          </label>
        )}

        {isCapacitorNative() && (
          <label className="flex items-center justify-between gap-3 pt-2 border-t border-slate-100 dark:border-slate-700 cursor-pointer">
            <div>
              <p className="text-sm font-medium">قفل بصمة عند فتح التطبيق</p>
              <p className="text-xs text-slate-400 mt-0.5">يطلب بصمتك المسجَّلة على الجهاز فوراً عند كل فتح للتطبيق</p>
            </div>
            <input
              type="checkbox"
              checked={data.settings?.biometricLockEnabled === true}
              onChange={e => updateSettings({ biometricLockEnabled: e.target.checked })}
              className="w-5 h-5 accent-secondary shrink-0"
            />
          </label>
        )}
      </div>

      <AIVoiceSettings />

      
      <div className="bg-surface rounded-2xl p-6 shadow-soft border border-red-200 dark:border-red-900/50 space-y-4">
        <h3 className="font-bold text-red-600 dark:text-red-400">حذف جميع البيانات</h3>
        <p className="text-sm text-slate-500 dark:text-slate-400">يحذف العملاء والأصناف والفواتير وكل الحركات. لا يمكن التراجع. يتطلب كلمة مرور الأرباح.</p>
        <input type="password" value={wipePassword} onChange={e => setWipePassword(e.target.value)}
          placeholder="كلمة مرور الأرباح للتأكيد"
          className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-transparent outline-none focus:ring-2 focus:ring-red-500" />
        <button
          type="button"
          onClick={() => { if (clearAllData(wipePassword)) setWipePassword(''); }}
          className="bg-red-600 hover:bg-red-700 text-white px-5 py-2.5 rounded-xl font-medium"
        >
          حذف جميع البيانات
        </button>
      </div>

      {/* License */}
      <div className="bg-surface rounded-2xl p-6 shadow-soft border border-slate-100 dark:border-slate-700 space-y-4">
        <h3 className="font-bold flex items-center gap-2"><Key className="w-5 h-5" /> الترخيص</h3>
        {licenseValid ? (
          <p className="text-green-600 font-medium">البرنامج مفعّل ✓</p>
        ) : (
          <p className="text-amber-600">متبقي {trialDaysLeft} أيام من الفترة التجريبية</p>
        )}
        <div>
          <label className="text-xs text-slate-500 block mb-1">
            {isCapacitorNative() ? 'معرّف الجهاز (Device ID)' : 'معرف الجهاز (Machine ID)'}
          </label>
          <div className="flex gap-2">
            <input readOnly value={machineId} className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 text-sm font-mono" />
            <button onClick={() => navigator.clipboard.writeText(machineId)} className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-700 text-sm">نسخ</button>
          </div>
        </div>
        {!licenseValid && (
          <>
            <input value={licenseCode} onChange={e => setLicenseCode(e.target.value)} placeholder="أدخل كود التفعيل"
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-transparent outline-none focus:ring-2 focus:ring-secondary" />
            <button onClick={handleActivate} className="bg-secondary text-white px-5 py-2.5 rounded-xl font-medium hover:bg-emerald-600">
              تفعيل
            </button>
            <p className="text-xs text-slate-400">اطلب كود التفعيل من البائع بعد إرسال Machine ID. اطلب كود التفعيل من البائع باستخدام Machine ID</p>
          </>
        )}
      </div>
    </div>
  );
}
