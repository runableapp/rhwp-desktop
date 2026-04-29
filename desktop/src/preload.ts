import { contextBridge, ipcRenderer } from 'electron';

export type OpenFileResult =
  | { ok: true; path: string; bytes: ArrayBuffer }
  | { ok: false; reason: 'cancelled' | 'error'; message?: string };

export type SaveFileResult =
  | { ok: true; path: string }
  | { ok: false; reason: 'cancelled' | 'error'; message?: string };

contextBridge.exposeInMainWorld('hwpDesktop', {
  getVersion: async (): Promise<string> => ipcRenderer.invoke('app:getVersion'),
  openFile: async (): Promise<OpenFileResult> => ipcRenderer.invoke('hwp:openFile'),
  saveFile: async (suggestedName: string, bytes: Uint8Array): Promise<SaveFileResult> =>
    ipcRenderer.invoke('hwp:saveFile', { suggestedName, bytes }),
  openExternal: async (url: string): Promise<void> => {
    await ipcRenderer.invoke('shell:openExternal', url);
  },
});

