import { useState, useEffect } from 'react';
import { useApp } from '../store/AppContext';
import { exportToJSON, importFromJSON, getStorageMode } from '../db/storage';
import { Download, Upload, Save, Key } from 'lucide-react';
import { appAlert, appConfirm } from '../lib/dialogs';

export default function Settings() {
  const { data, updateSettings, activateLicenseSecure, trialDaysLeft, licenseValid } = useApp();
  const [form, setForm] = useState(data.settings);
  const [machineId, setMachineId] = useState('');
  const [licenseCode, setLicenseCode] = useState('');
  const [msg, setMsg] = useState('');

  useEffect(() => {
    if (window.electronAPI) {
      window.electronAPI.getMachineId().then(setMachineId);
    } else {
      setMachineId('WEB-DEMO-' + Math.random().toString(36).slice(2, 10).toUpperCase());
    }
  }, []);

  const handleSave = () => {
    updateSettings({ name: form.name, phone: form.phone, address: form.address, currency: form.currency });
    setMsg('تم حفظ الإعدادات');
    setTimeout(() => setMsg(''), 2000);
  };

  const handleExport = () => {
    const json = exportToJSON();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `agri-plus-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
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
