export {};

declare global {
  interface Window {
    hwpDesktop?: {
      /** Desktop app version (from Electron `app.getVersion()`). */
      getVersion: () => Promise<string>;
      openFile: () => Promise<
        | { ok: true; path: string; bytes: ArrayBuffer }
        | { ok: false; reason: 'cancelled' | 'error'; message?: string }
      >;
      saveFile: (
        suggestedName: string,
        bytes: Uint8Array,
      ) => Promise<
        | { ok: true; path: string }
        | { ok: false; reason: 'cancelled' | 'error'; message?: string }
      >;
      /** Open URL in the system default browser (desktop shell). */
      openExternal: (url: string) => Promise<void>;
    };
  }
}

