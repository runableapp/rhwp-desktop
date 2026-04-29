import { app, BrowserWindow, Menu, dialog, ipcMain, protocol, shell } from 'electron';
import path from 'node:path';
import fs from 'node:fs/promises';

const UI_DEV_SERVER_URL = process.env.UI_DEV_SERVER_URL;
const OPEN_DEVTOOLS = process.env.OPEN_DEVTOOLS === '1';

// AppImage runs from a FUSE mount where the Chromium SUID sandbox helper
// (chrome-sandbox) cannot be root-owned/mode 4755. Without this switch Electron
// will abort on many distros with:
// "The SUID sandbox helper binary was found, but is not configured correctly."
// If you want to force-enable sandboxing, set RHWP_ENABLE_CHROMIUM_SANDBOX=1.
if (process.platform === 'linux' && process.env.RHWP_ENABLE_CHROMIUM_SANDBOX !== '1') {
  app.commandLine.appendSwitch('no-sandbox');
}

// Needed so fetch()/import.meta.url work correctly for WASM/assets in prod.
protocol.registerSchemesAsPrivileged([
  {
    scheme: 'app',
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      corsEnabled: true,
      stream: true,
    },
  },
]);

function getPreloadPath(): string {
  // In dev, main.js runs from .../desktop/dist, and preload.js sits next to it.
  // Using __dirname is the most reliable across dev/prod entrypoints.
  return path.resolve(__dirname, 'preload.js');
}

function getUiIndexPath(): string {
  // In dev (running from dist/main.js), app.getAppPath() is .../desktop/dist.
  // Use process.cwd() (expected .../desktop) to locate ../ui/dist/index.html reliably.
  return path.resolve(process.cwd(), '..', 'ui', 'dist', 'index.html');
}

function getUiDistDir(): string {
  // Dev: ../ui/dist
  // Packaged: resources/ui-dist (copied by electron-builder extraResources)
  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'ui-dist');
  }
  return path.resolve(process.cwd(), '..', 'ui', 'dist');
}

async function registerAppProtocol(): Promise<void> {
  const distDir = getUiDistDir();

  protocol.registerFileProtocol('app', (request, callback) => {
    try {
      const url = new URL(request.url);
      // app://./ -> "/"
      let relPath = decodeURIComponent(url.pathname);
      if (relPath === '/' || relPath === '') relPath = '/index.html';
      // path.join treats a leading "/" as absolute and ignores distDir; strip it.
      relPath = relPath.replace(/^\/+/, '');
      // Prevent path traversal
      const absPath = path.normalize(path.join(distDir, relPath));
      if (!absPath.startsWith(distDir)) {
        callback({ error: -6 }); // net::ERR_FILE_NOT_FOUND
        return;
      }
      callback({ path: absPath });
    } catch {
      callback({ error: -6 });
    }
  });
}

async function createMainWindow(): Promise<void> {
  const win = new BrowserWindow({
    width: 1280,
    height: 900,
    backgroundColor: '#111827',
    autoHideMenuBar: true,
    webPreferences: {
      preload: getPreloadPath(),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  if (UI_DEV_SERVER_URL) {
    await win.loadURL(UI_DEV_SERVER_URL);
    if (OPEN_DEVTOOLS) win.webContents.openDevTools({ mode: 'detach' });
  } else {
    // Production: serve Vite build output over app:// so WASM/assets can be fetched.
    await win.loadURL('app://./index.html');
    if (OPEN_DEVTOOLS) win.webContents.openDevTools({ mode: 'detach' });
  }

  // http(s) links intended for a new window/tab open in the system default browser.
  win.webContents.setWindowOpenHandler((details) => {
    const url = details.url;
    if (url.startsWith('http:') || url.startsWith('https:')) {
      void shell.openExternal(url);
    }
    return { action: 'deny' };
  });
}

ipcMain.handle('shell:openExternal', async (_evt, url: unknown) => {
  if (typeof url !== 'string' || (!url.startsWith('http:') && !url.startsWith('https:'))) {
    return;
  }
  await shell.openExternal(url);
});

ipcMain.handle('app:getVersion', () => {
  return app.getVersion();
});

ipcMain.handle('hwp:openFile', async () => {
  try {
    const res = await dialog.showOpenDialog({
      title: 'HWP 파일 열기',
      properties: ['openFile'],
      filters: [{ name: 'HWP', extensions: ['hwp', 'hwpx'] }, { name: 'All Files', extensions: ['*'] }],
    });

    if (res.canceled || res.filePaths.length === 0) {
      return { ok: false, reason: 'cancelled' } as const;
    }

    const filePath = res.filePaths[0];
    const buf = await fs.readFile(filePath);
    return { ok: true, path: filePath, bytes: buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) };
  } catch (e) {
    return { ok: false, reason: 'error', message: e instanceof Error ? e.message : String(e) } as const;
  }
});

ipcMain.handle('hwp:saveFile', async (_evt, arg: { suggestedName: string; bytes: Uint8Array }) => {
  try {
    const res = await dialog.showSaveDialog({
      title: '저장',
      defaultPath: arg.suggestedName,
    });
    if (res.canceled || !res.filePath) {
      return { ok: false, reason: 'cancelled' } as const;
    }

    await fs.writeFile(res.filePath, Buffer.from(arg.bytes));
    return { ok: true, path: res.filePath } as const;
  } catch (e) {
    return { ok: false, reason: 'error', message: e instanceof Error ? e.message : String(e) } as const;
  }
});

app.whenReady().then(async () => {
  // Remove Electron native menu (File/Edit/...) — rhwp-studio provides its own.
  Menu.setApplicationMenu(null);

  if (!UI_DEV_SERVER_URL) {
    await registerAppProtocol();
  }
  await createMainWindow();
  app.on('activate', async () => {
    if (BrowserWindow.getAllWindows().length === 0) await createMainWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

