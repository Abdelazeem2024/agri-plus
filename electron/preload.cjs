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
  dbPath: () => ipcRenderer.invoke('db-path'),

  // License
  licenseValidate: (code, machineId) => ipcRenderer.invoke('license-validate', code, machineId),
  licenseGenerate: (machineId, type, years) => ipcRenderer.invoke('license-generate', machineId, type, years),
  focusWindow: () => ipcRenderer.invoke('focus-window'),
  printToPdf: () => ipcRenderer.invoke('print-to-pdf'),
  showMessageSync: (message) => ipcRenderer.sendSync('show-message-sync', message),
  showConfirmSync: (message) => ipcRenderer.sendSync('show-confirm-sync', message)
});
