const { app, BrowserWindow, dialog } = require('electron');
const { listen } = require('./server.cjs');

let server;
async function createWindow() {
  // app.getAppPath() es la raíz del proyecto (o app.asar al empaquetar).
  const started = await listen(app.getAppPath(), 8787);
  server = started.server;
  const url = `http://127.0.0.1:${started.port}/`;
  const win = new BrowserWindow({
    width: 1440, height: 900, minWidth: 960, minHeight: 640,
    title: 'Ocarto', autoHideMenuBar: true,
    webPreferences: { contextIsolation: true, sandbox: true }
  });
  win.loadURL(url);
}
app.whenReady().then(() => createWindow().catch(e => { dialog.showErrorBox('Ocarto', e.message); app.quit(); }));
app.on('window-all-closed', () => { if (server) server.close(); app.quit(); });
app.on('before-quit', () => { if (server) server.close(); });
process.on('uncaughtException', error => dialog.showErrorBox('Ocarto', error.message));
