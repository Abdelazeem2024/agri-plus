const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  getMachineId: () => ipcRenderer.invoke('get-machine-id'),
  getAppPath: () => ipcRenderer.invoke('get-app-path'),
  getUserDataPath: () => ipcRenderer.invoke('get-user-data-path'),
  saveFileDialog: (options) => ipcRenderer.invoke('save-file-dialog', options),
  openFileDialog: (options) => ipcRenderer.invoke('open-file-dialog', options),
  writeFile: (filePath, data) => ipcRenderer.invoke('write-file', filePath, data),
  readFile: (filePath) => ipcRenderer.invoke('read-file', filePath),
  openExternal: (url) => ipcRenderer.invoke('open-external', url),

  // SQLite Database
  dbLoad: () => ipcRenderer.invoke('db-load'),
  dbSave: (data) => ipcRenderer.invoke('db-save', data),
  dbExportJson: () => ipcRenderer.invoke('db-export-json'),
  dbImportJson: (json) => ipcRenderer.invoke('db-import-json', json),
  backupConfigGet: () => ipcRenderer.invoke('backup-config-get'),
  backupConfigChooseFolder: () => ipcRenderer.invoke('backup-config-choose-folder'),
  backupConfigSetEnabled: (enabled) => ipcRenderer.invoke('backup-config-set-enabled', enabled),
  backupRunNow: () => ipcRenderer.invoke('backup-run-now'),
  dbPath: () => ipcRenderer.invoke('db-path'),

  // License
  licenseValidate: (code, machineId) => ipcRenderer.invoke('license-validate', code, machineId),
  focusWindow: () => ipcRenderer.invoke('focus-window'),
  printToPdf: () => ipcRenderer.invoke('print-to-pdf'),
  exportHtmlToPdf: (html, suggestedFileName) => ipcRenderer.invoke('export-html-to-pdf', html, suggestedFileName),
  showMessageSync: (message) => ipcRenderer.sendSync('show-message-sync', message),
  showConfirmSync: (message) => ipcRenderer.sendSync('show-confirm-sync', message)
});
