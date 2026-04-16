export {};

declare global {
  interface Window {
    hwpDesktop?: {
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
    };
  }
}

