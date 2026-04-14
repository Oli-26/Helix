import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'node:path';
import started from 'electron-squirrel-startup';
import { registerGitHandlers } from './ipc/git-handlers';
import { registerAppHandlers, store } from './ipc/app-handlers';
import { registerShellHandlers } from './ipc/shell-handlers';

if (started) {
  app.quit();
}

let mainWindow: BrowserWindow | null = null;

const createWindow = () => {
  const isMac = process.platform === 'darwin';
  const savedBounds = store.get('windowBounds', { width: 1400, height: 900 });

  mainWindow = new BrowserWindow({
    width: savedBounds.width,
    height: savedBounds.height,
    x: savedBounds.x,
    y: savedBounds.y,
    minWidth: 900,
    icon: path.join(__dirname, '../../assets/icon.png'),
    minHeight: 600,
    frame: isMac, // frameless on Linux/Windows, native frame on Mac
    titleBarStyle: isMac ? 'hidden' : undefined,
    backgroundColor: '#0d1117',
    show: false, // prevent flash, show when ready
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (savedBounds.isMaximized) {
    mainWindow.maximize();
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(
      path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`),
    );
  }

  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.webContents.openDevTools();
  }

  // Window control IPC handlers
  ipcMain.on('window:minimize', () => mainWindow?.minimize());
  ipcMain.on('window:maximize', () => {
    if (mainWindow?.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow?.maximize();
    }
  });
  ipcMain.on('window:close', () => mainWindow?.close());
  ipcMain.handle('window:is-maximized', () => mainWindow?.isMaximized());

  mainWindow.on('maximize', () => {
    mainWindow?.webContents.send('window:maximized-changed', true);
    store.set('windowBounds.isMaximized', true);
  });
  mainWindow.on('unmaximize', () => {
    mainWindow?.webContents.send('window:maximized-changed', false);
    store.set('windowBounds.isMaximized', false);
  });

  // Save window bounds on resize/move
  const saveBounds = () => {
    if (!mainWindow || mainWindow.isMaximized()) return;
    const bounds = mainWindow.getBounds();
    store.set('windowBounds', {
      x: bounds.x,
      y: bounds.y,
      width: bounds.width,
      height: bounds.height,
      isMaximized: false,
    });
  };
  mainWindow.on('resized', saveBounds);
  mainWindow.on('moved', saveBounds);
};

// Register all IPC handlers
registerGitHandlers();
registerAppHandlers();
registerShellHandlers();

app.on('ready', createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
