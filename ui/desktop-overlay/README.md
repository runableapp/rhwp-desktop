# Desktop overlay for rhwp-studio

Files here are applied **after** syncing upstream `rhwp-studio` from the rhwp repo.
They preserve Electron desktop integrations (file dialogs, about dialog, WASM import path).

Do not edit synced files under `ui/src/` directly for desktop-only behavior — change this overlay
and re-run `./scripts/build-rhwp-wasm-and-sync.sh`.

Desktop-specific edits to upstream modules use patches in `patches/` (e.g. `file.ts.desktop.patch`)
rather than replacing whole files, so upstream exports stay in sync.
