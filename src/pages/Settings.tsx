import { useState, useEffect } from 'react';
import { useApp } from '../store/AppContext';
import { exportToJSONAsync, importFromJSON, getStorageMode } from '../db/storage';
import { Download, Upload, Save, Key, Image as ImageIcon, X } from 'lucide-react';
import { appAlert, appConfirm } from '../lib/dialogs';

export default function Settings() {
  const { data, updateSettings, clearAllData, activateLicenseSecure, trialDaysLeft, licenseValid } = useApp();
  const [form, setForm] = useState(data.settings);
  const [machineId, setMachineId] = useState('');
  const [licenseCode, setLicenseCode] = useState('');
  const [wipePassword, setWipePassword] = useState('');
  const [msg, setMsg] = useState('');

  useEffect(() => {
    if (window.electronAPI) {
      window.electronAPI.getMachineId().then(setMachineId);
    } else {
      setMachineId('WEB-DEMO-' + Math.random().toString(36).slice(2, 10).toUpperCase());
    }
  }, []);

  const handleSave = () => {
    updateSettings({ name: form.name, phone: form.phone, address: form.address, currency: form.currency, logo: form.logo });
    setMsg('تم حفظ الإعدادات');
    setTimeout(() => setMsg(''), 2000);
  };

  const MAX_LOGO_DIMENSION = 300; // px — يكفي للطباعة بجودة عالية دون تضخيم حجم الملف

  const handleLogoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      appAlert('اختر ملف صورة صالح (PNG أو JPG)');
      return;
    }
    if (file.size > 3 * 1024 * 1024) {
      appAlert('حجم الصورة كبير جداً. اختر شعاراً أصغر من 3 ميجابايت');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const img = new window.Image();
      img.onload = () => {
        // تصغير الشعار إلى مقاس مناسب للطباعة مع الحفاظ على النسبة
        const scale = Math.min(1, MAX_LOGO_DIMENSION / Math.max(img.width, img.height));
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.drawImage(img, 0, 0, w, h);
        const dataUrl = canvas.toDataURL('image/png', 0.92);
        setForm(f => ({ ...f, logo: dataUrl }));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  };

  const removeLogo = () => setForm(f => ({ ...f, logo: '' }));

  const handleExport = async () => {
    // نستخدم النسخة غير المتزامنة التي تقرأ مباشرة من قاعدة بيانات SQLite (في تطبيق سطح المكتب)
    // بدل الاعتماد فقط على النسخة المخبأة في الذاكرة، لضمان أن ملف التصدير يشمل كل شيء دون أي فارق توقيت
    const json = await exportToJSONAsync();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `agri-plus-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      const result = await importFromJSON(reader.result as string);
      if (result.success) {
        appAlert(`تم الاستيراد بنجاح\nعملاء: ${result.summary?.customers}\nأصناف: ${result.summary?.products}\nفواتير: ${result.summary?.invoices}\nمندوبين: ${result.summary?.representatives}`);
        window.location.reload();
      } else {
        appAlert('فشل الاستيراد: ' + result.message);
      }
    };
    reader.readAsText(file);
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
          محرك التخزين: {getStorageMode() === 'sqlite' ? 'SQLite (قاعدة بيانات احترافية)' : 'localStorage (وضع المتصفح)'}
        </p>
      </div>

      {msg && <div className="bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300 px-4 py-2 rounded-xl text-sm">{msg}</div>}

      {/* Company */}
      <div className="bg-surface rounded-2xl p-6 shadow-soft border border-slate-100 dark:border-slate-700 space-y-4">
        <h3 className="font-bold">بيانات الشركة</h3>
        <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="اسم الشركة (يظهر في التقارير)"
          className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-transparent outline-none focus:ring-2 focus:ring-secondary" />
        <input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="رقم الهاتف (يظهر في التقارير)"
          className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-transparent outline-none focus:ring-2 focus:ring-secondary" />
        <input value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} placeholder="العنوان"
          className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-transparent outline-none focus:ring-2 focus:ring-secondary" />

        <div>
          <label className="text-xs text-slate-500 block mb-2">شعار الشركة (يظهر في رأس كل تقرير وكشف حساب مُصدَّر)</label>
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-xl bg-slate-50 dark:bg-slate-800 border border-dashed border-slate-300 dark:border-slate-600 flex items-center justify-center overflow-hidden shrink-0">
              {form.logo
                ? <img src={form.logo} alt="شعار الشركة" className="w-full h-full object-contain" />
                : <ImageIcon className="w-6 h-6 text-slate-300" />}
            </div>
            <label className="flex items-center gap-2 bg-slate-100 dark:bg-slate-700 px-4 py-2.5 rounded-xl text-sm cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-600">
              <Upload className="w-4 h-4" /> {form.logo ? 'تغيير الشعار' : 'رفع شعار'}
              <input type="file" accept="image/*" onChange={handleLogoSelect} className="hidden" />
            </label>
            {form.logo && (
              <button type="button" onClick={removeLogo} className="flex items-center gap-1 text-red-500 text-sm hover:text-red-600">
                <X className="w-4 h-4" /> إزالة
              </button>
            )}
          </div>
        </div>

        <button onClick={handleSave} className="flex items-center gap-2 bg-secondary text-white px-5 py-2.5 rounded-xl font-medium hover:bg-emerald-600">
          <Save className="w-4 h-4" /> حفظ الإعدادات
        </button>
      </div>

      {/* Backup */}
      <div className="bg-surface rounded-2xl p-6 shadow-soft border border-slate-100 dark:border-slate-700 space-y-4">
        <h3 className="font-bold">النسخ الاحتياطي والاستيراد</h3>
        <div className="flex flex-wrap gap-3">
          <button onClick={handleExport} className="flex items-center gap-2 bg-slate-800 text-white px-4 py-2.5 rounded-xl text-sm hover:bg-slate-700">
            <Download className="w-4 h-4" /> تصدير JSON
          </button>
          <label className="flex items-center gap-2 bg-slate-100 dark:bg-slate-700 px-4 py-2.5 rounded-xl text-sm cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-600">
            <Upload className="w-4 h-4" /> استيراد JSON
            <input type="file" accept=".json" onChange={handleImport} className="hidden" />
          </label>
        </div>
      </div>

      
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
          <label className="text-xs text-slate-500 block mb-1">معرف الجهاز (Machine ID)</label>
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
