const { app, BrowserWindow, dialog } = require('electron');
const path = require('node:path');
const { spawn } = require('node:child_process');

let server;
function startLocalServer() {
  const script = path.join(process.resourcesPath, 'servidor-ocarto.ps1');
  server = spawn('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', script], { windowsHide: true });
}
function createWindow() {
  const win = new BrowserWindow({
    width: 1440, height: 900, minWidth: 960, minHeight: 640,
    title: 'Ocarto', autoHideMenuBar: true,
    webPreferences: { contextIsolation: true, sandbox: true }
  });
  win.loadURL('http://127.0.0.1:8787/');
  win.webContents.on('did-fail-load', () => setTimeout(() => win.loadURL('http://127.0.0.1:8787/'), 700));
}
app.whenReady().then(() => { startLocalServer(); setTimeout(createWindow, 900); });
app.on('window-all-closed', () => { if (server) server.kill(); if (process.platform !== 'darwin') app.quit(); });
app.on('before-quit', () => { if (server) server.kill(); });
process.on('uncaughtException', error => dialog.showErrorBox('Ocarto', error.message));
