const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');
const crypto = require('crypto');
const licenseMod = require('./license.cjs');

const isDev = process.env.NODE_ENV === 'development';
let mainWindow = null;
let dbModule = null;

function getMachineId() {
  const hostname = os.hostname();
  const platform = os.platform();
  const arch = os.arch();
  const cpus = os.cpus()[0]?.model || 'unknown';
  const raw = `${hostname}-${platform}-${arch}-${cpus}`;
  return crypto.createHash('sha256').update(raw).digest('hex').substring(0, 32).toUpperCase();
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
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.once('ready-to-show', () => mainWindow.show());
  mainWindow.on('closed', () => { mainWindow = null; });
}

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
ipcMain.handle('get-machine-id', () => licenseMod.getMachineId());

ipcMain.handle('license-validate', (_, code, machineId) => {
  return licenseMod.validateLicense(code, machineId || licenseMod.getMachineId());
});

ipcMain.handle('license-generate', (_, machineId, type, years) => {
  try {
    const key = licenseMod.generateLicense(machineId, type || 'PERM', years || 1);
    return { success: true, key };
  } catch (e) {
    return { success: false, error: e.message };
  }
});
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
