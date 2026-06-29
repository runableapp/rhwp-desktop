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
const CHROMIUM_SANDBOX_ENABLED =
  process.platform !== 'linux' || process.env.RHWP_ENABLE_CHROMIUM_SANDBOX === '1';

if (process.platform === 'linux' && !CHROMIUM_SANDBOX_ENABLED) {
  app.commandLine.appendSwitch('no-sandbox');
  // Cursor/CI/containers often restrict /dev/shm; without this the GPU/renderer
  // process can FATAL and the window stays blank (title "Electron").
  app.commandLine.appendSwitch('disable-dev-shm-usage');
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

function getUiDistDir(): string {
  // Packaged: resources/ui-dist (copied by electron-builder extraResources)
  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'ui-dist');
  }
  // Dev: desktop/dist/main.js → ../../ui/dist (independent of process.cwd())
  return path.resolve(__dirname, '..', '..', 'ui', 'dist');
}

function isPathInsideDir(parentDir: string, candidatePath: string): boolean {
  const parent = path.resolve(parentDir);
  const candidate = path.resolve(candidatePath);
  return candidate === parent || candidate.startsWith(parent + path.sep);
}

async function registerAppProtocol(): Promise<void> {
  const distDir = path.resolve(getUiDistDir());

  protocol.registerFileProtocol('app', (request, callback) => {
    try {
      const url = new URL(request.url);
      let relPath = decodeURIComponent(url.pathname);
      if (relPath === '/' || relPath === '') relPath = '/index.html';
      relPath = relPath.replace(/^\/+/, '');
      const absPath = path.normalize(path.join(distDir, relPath));
      if (!isPathInsideDir(distDir, absPath)) {
        callback({ error: -6 }); // net::ERR_FILE_NOT_FOUND
        return;
      }
      callback({ path: absPath });
    } catch {
      callback({ error: -6 });
    }
  });
}

const APP_PROTOCOL_URL = 'app://desktop/index.html';

async function createMainWindow(): Promise<void> {
  const win = new BrowserWindow({
    width: 1280,
    height: 900,
    backgroundColor: '#111827',
    autoHideMenuBar: true,
    title: 'rhwp-desktop',
    webPreferences: {
      preload: getPreloadPath(),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: CHROMIUM_SANDBOX_ENABLED,
    },
  });

  win.webContents.on('did-fail-load', (_event, errorCode, errorDescription, validatedURL) => {
    console.error(`[main] failed to load ${validatedURL}: ${errorCode} ${errorDescription}`);
  });

  if (UI_DEV_SERVER_URL) {
    await win.loadURL(UI_DEV_SERVER_URL);
    if (OPEN_DEVTOOLS) win.webContents.openDevTools({ mode: 'detach' });
  } else {
    const distDir = getUiDistDir();
    const indexPath = path.join(distDir, 'index.html');
    try {
      await fs.access(indexPath);
    } catch {
      throw new Error(`UI build not found at ${indexPath}. Run: cd ui && npm run build`);
    }
    await win.loadURL(APP_PROTOCOL_URL);
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
  Menu.setApplicationMenu(null);

  if (!UI_DEV_SERVER_URL) {
    await registerAppProtocol();
  }
  try {
    await createMainWindow();
  } catch (err) {
    console.error('[main] failed to create window:', err);
    app.exit(1);
  }
  app.on('activate', async () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      try {
        await createMainWindow();
      } catch (err) {
        console.error('[main] failed to create window:', err);
      }
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

