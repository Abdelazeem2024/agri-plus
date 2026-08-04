const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const licenseMod = require('./license.cjs');
const integrityMod = require('./integrity.cjs');

const isDev = process.env.NODE_ENV === 'development';
let mainWindow = null;
let dbModule = null;

// فحص سلامة ملفات التفعيل عند الإقلاع — راجع electron/integrity.cjs للتفاصيل.
// لا نوقف البرنامج بالكامل عند اكتشاف تلاعب (تجنباً لتعطيل عملاء شرعيين بسبب
// مضاد فيروسات غيّر بايت بالخطأ)، لكن نمنع اعتماد أي تفعيل طالما الفحص فاشل.
const integrityResult = integrityMod.checkIntegrity();
if (integrityResult.checked && !integrityResult.ok) {
  console.error('⚠️ فشل فحص سلامة الملفات! الملفات المتأثرة:', integrityResult.mismatches.join(', '));
}
function isIntegrityOk() {
  return !integrityResult.checked || integrityResult.ok;
}

function getDb() {
  if (!dbModule) {
    dbModule = require('./db.cjs');
    dbModule.initDatabase();
  }
  return dbModule;
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1100,
    minHeight: 700,
    show: false,
    backgroundColor: '#0F172A',
    icon: path.join(__dirname, '../public/logo.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    },
    autoHideMenuBar: true
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    const indexPath = path.join(__dirname, '../dist/index.html');
    mainWindow.loadFile(indexPath).catch(err => console.error('loadFile error', err));
    mainWindow.webContents.on('did-fail-load', (_e, code, desc, url) => {
      console.error('did-fail-load', code, desc, url);
    });
    mainWindow.webContents.on('render-process-gone', (_e, details) => {
      console.error('render-process-gone', details);
    });
  }

  mainWindow.once('ready-to-show', () => mainWindow.show());
  mainWindow.on('closed', () => { mainWindow = null; });
}

app.on('before-quit', () => {
  try {
    if (dbModule) {
      // data already saved by renderer; ensure db closed cleanly
    }
  } catch (_) {}
});

// نوافذ الطباعة/التقارير المفتوحة عبر window.open() في الواجهة (تقارير، كشوف حساب).
// بدون هذا المعالج، Electron يترك نوافذ "يتيمة" بلا preload ولا إغلاق تلقائي،
// وتتكدّس عند فتح أكثر من تقرير فتُجمّد الواجهة الرئيسية. هذا هو الإصلاح الجذري لتلك المشكلة.
app.on('web-contents-created', (_event, contents) => {
  contents.setWindowOpenHandler(() => ({
    action: 'allow',
    overrideBrowserWindowOptions: {
      width: 950,
      height: 750,
      autoHideMenuBar: true,
      backgroundColor: '#ffffff',
      icon: path.join(__dirname, '../public/logo.png'),
      webPreferences: { sandbox: true, contextIsolation: true, nodeIntegration: false }
    }
  }));
});

app.whenReady().then(() => {
  // Init SQLite early
  try { getDb(); } catch (e) { console.error('DB init error:', e); }

  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  try { if (dbModule) dbModule.closeDb(); } catch (_) {}
  if (process.platform !== 'darwin') app.quit();
});

// ── IPC: System ──
ipcMain.on('show-message-sync', (event, message) => {
  dialog.showMessageBoxSync(mainWindow || undefined, {
    type: 'info',
    title: 'Agri Plus',
    message: String(message || ''),
    buttons: ['حسناً'],
    noLink: true
  });
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.focus();
    mainWindow.webContents.focus();
  }
  event.returnValue = true;
});

ipcMain.on('show-confirm-sync', (event, message) => {
  const result = dialog.showMessageBoxSync(mainWindow || undefined, {
    type: 'question',
    title: 'Agri Plus',
    message: String(message || ''),
    buttons: ['نعم', 'لا'],
    defaultId: 0,
    cancelId: 1,
    noLink: true
  });
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.focus();
    mainWindow.webContents.focus();
  }
  event.returnValue = result === 0;
});

ipcMain.handle('print-to-pdf', async () => {
  if (!mainWindow || mainWindow.isDestroyed()) return { success: false };
  try {
    const pdf = await mainWindow.webContents.printToPDF({
      printBackground: true,
      landscape: false,
      pageSize: 'A4'
    });
    const { filePath, canceled } = await dialog.showSaveDialog(mainWindow, {
      defaultPath: 'report.pdf',
      filters: [{ name: 'PDF', extensions: ['pdf'] }]
    });
    if (canceled || !filePath) return { success: false, canceled: true };
    fs.writeFileSync(filePath, pdf);
    return { success: true, path: filePath };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

ipcMain.handle('focus-window', () => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
    mainWindow.webContents.focus();
  }
  return true;
});

ipcMain.handle('get-machine-id', () => licenseMod.getMachineId());

ipcMain.handle('license-validate', (_, code, machineId) => {
  // إذا فشل فحص سلامة الملفات، نرفض أي تفعيل بشكل حازم (fail-closed) — لا يمكننا
  // الوثوق بنتيجة التحقق نفسها إذا كانت ملفات التفعيل ذاتها قد تم العبث بها.
  if (!isIntegrityOk()) {
    return { valid: false, message: 'تعذّر التحقق: ملفات البرنامج غير سليمة. أعد تثبيت البرنامج من المصدر الرسمي.' };
  }
  return licenseMod.verifyLicenseCode(code, machineId || licenseMod.getMachineId());
});
// ملاحظة: لا يوجد أي معالج "license-generate" هنا عمداً — توليد الأكواد يحتاج
// المفتاح الخاص الذي لا يوجد إطلاقاً داخل برنامج العميل (فقط لدى البائع عبر
// أداة license-generator المنفصلة). هذا هو جوهر الحماية الجديدة.

ipcMain.handle('get-app-path', () => app.getPath('userData'));
ipcMain.handle('get-user-data-path', () => app.getPath('userData'));
ipcMain.handle('open-external', (_, url) => shell.openExternal(url));

ipcMain.handle('save-file-dialog', async (_, options) => {
  return dialog.showSaveDialog(mainWindow, options);
});
ipcMain.handle('open-file-dialog', async (_, options) => {
  return dialog.showOpenDialog(mainWindow, options);
});
ipcMain.handle('write-file', async (_, filePath, data) => {
  try {
    fs.writeFileSync(filePath, data, 'utf8');
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});
ipcMain.handle('read-file', async (_, filePath) => {
  try {
    return { success: true, data: fs.readFileSync(filePath, 'utf8') };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// ── IPC: Database (SQLite) ──
ipcMain.handle('db-load', () => {
  try {
    return { success: true, data: getDb().loadAllData() };
  } catch (err) {
    console.error(err);
    return { success: false, error: err.message };
  }
});

ipcMain.handle('db-save', (_, data) => {
  try {
    getDb().saveAllData(data);
    return { success: true };
  } catch (err) {
    console.error(err);
    return { success: false, error: err.message };
  }
});

ipcMain.handle('db-export-json', () => {
  try {
    return { success: true, data: getDb().exportJson() };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('db-import-json', (_, jsonStr) => {
  try {
    return getDb().importJson(jsonStr);
  } catch (err) {
    return { success: false, message: err.message };
  }
});

ipcMain.handle('db-path', () => {
  try {
    return getDb().getDbPath();
  } catch {
    return null;
  }
});
