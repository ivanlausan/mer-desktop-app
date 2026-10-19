'use strict';
const { app, BrowserWindow, Menu, ipcMain, protocol, net } = require('electron');
const fs = require('node:fs/promises');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

protocol.registerSchemesAsPrivileged([{
  scheme: 'merapp',
  privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true }
}]);

const APP_URL = 'merapp://app/index.html';
const SETTINGS_FILE = () => path.join(app.getPath('userData'), 'settings.json');
let apiBase = '';
let mainWindow = null;
let setupWindow = null;

function normalizeApiBase(value) {
  let parsed;
  try { parsed = new URL(String(value || '').trim()); }
  catch { throw new Error('Introduce la dirección HTTPS del servicio compartido.'); }
  const local = parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1';
  if (parsed.protocol !== 'https:' && !(local && parsed.protocol === 'http:')) {
    throw new Error('Por seguridad, usa HTTPS. HTTP solo se permite para localhost.');
  }
  if (parsed.username || parsed.password || parsed.pathname !== '/' || parsed.search || parsed.hash) {
    throw new Error('Introduce solo el dominio del servicio, sin rutas ni credenciales.');
  }
  return parsed.origin;
}
async function readSettings() {
  try {
    const data = JSON.parse(await fs.readFile(SETTINGS_FILE(), 'utf8'));
    apiBase = normalizeApiBase(data.apiBase);
  } catch { apiBase = ''; }
}
async function writeSettings() {
  const file = SETTINGS_FILE();
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, JSON.stringify({ apiBase }, null, 2), { encoding: 'utf8', mode: 0o600 });
}
function createMainWindow() {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.loadURL(APP_URL);
    mainWindow.focus();
    return mainWindow;
  }
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 940,
    minWidth: 980,
    minHeight: 680,
    show: false,
    title: 'Diseñador MER',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true
    }
  });
  mainWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  mainWindow.webContents.on('will-navigate', (event, target) => {
    if (!target.startsWith('merapp://app/')) event.preventDefault();
  });
  mainWindow.once('ready-to-show', () => mainWindow && mainWindow.show());
  mainWindow.on('closed', () => { mainWindow = null; });
  mainWindow.loadURL(APP_URL);
  return mainWindow;
}
function openSetup() {
  if (setupWindow && !setupWindow.isDestroyed()) {
    setupWindow.focus();
    return setupWindow;
  }
  setupWindow = new BrowserWindow({
    width: 560,
    height: 460,
    resizable: false,
    title: 'Conectar el servicio compartido',
    parent: mainWindow || undefined,
    modal: !!mainWindow,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });
  setupWindow.setMenuBarVisibility(false);
  setupWindow.on('closed', () => { setupWindow = null; });
  setupWindow.loadFile(path.join(__dirname, 'setup.html'));
  return setupWindow;
}
function installMenu() {
  const menu = Menu.buildFromTemplate([
    { label: 'Archivo', submenu: [
      { label: 'Configurar servicio compartido…', click: () => openSetup() },
      { type: 'separator' },
      { role: 'quit', label: 'Salir' }
    ] },
    { label: 'Editar', submenu: [
      { role: 'undo' }, { role: 'redo' }, { type: 'separator' },
      { role: 'cut' }, { role: 'copy' }, { role: 'paste' }, { role: 'selectAll' }
    ] },
    { label: 'Ver', submenu: [
      { role: 'reload' }, { role: 'togglefullscreen' }, { role: 'toggledevtools' }
    ] }
  ]);
  Menu.setApplicationMenu(menu);
}

ipcMain.on('mer:get-api-base', event => { event.returnValue = apiBase; });
ipcMain.handle('mer:save-api-base', async (event, value) => {
  if (!setupWindow || event.sender !== setupWindow.webContents || event.senderFrame !== event.sender.mainFrame) {
    throw new Error('No se pudo validar la ventana de configuración.');
  }
  apiBase = normalizeApiBase(value);
  await writeSettings();
  if (mainWindow && !mainWindow.isDestroyed()) await mainWindow.loadURL(APP_URL);
  else createMainWindow();
  if (setupWindow && !setupWindow.isDestroyed()) setupWindow.close();
  return { apiBase };
});

app.whenReady().then(async () => {
  protocol.handle('merapp', request => {
    const requested = new URL(request.url);
    if (requested.hostname !== 'app' || (requested.pathname !== '/' && requested.pathname !== '/index.html')) {
      return new Response('No encontrado', { status: 404 });
    }
    return net.fetch(pathToFileURL(path.join(__dirname, 'public', 'index.html')).toString());
  });
  installMenu();
  await readSettings();
  if (apiBase) createMainWindow();
  else openSetup();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) apiBase ? createMainWindow() : openSetup();
  });
});
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
