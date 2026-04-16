import fs from 'node:fs/promises';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

if (process.platform !== 'darwin') {
  console.log('[icons] gen-mac-icns: skipped (not macOS)');
  process.exit(0);
}

const desktopDir = path.resolve(import.meta.dirname, '..');
const buildResDir = path.resolve(desktopDir, 'build-resources');
const srcPng = path.resolve(buildResDir, 'icon.png');
const outIcns = path.resolve(buildResDir, 'icon.icns');
const iconsetDir = path.resolve(buildResDir, 'icon.iconset');

async function exists(p) {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

if (!(await exists(srcPng))) {
  throw new Error(`[icons] missing ${srcPng}. Run "npm run prepare:icons" first.`);
}

await fs.rm(iconsetDir, { recursive: true, force: true });
await fs.mkdir(iconsetDir, { recursive: true });

function run(cmd, args) {
  const r = spawnSync(cmd, args, { stdio: 'inherit' });
  if (r.status !== 0) {
    throw new Error(`[icons] command failed: ${cmd} ${args.join(' ')}`);
  }
}

// Generate iconset PNGs via built-in sips.
const sizes = [
  { px: 16, name: 'icon_16x16.png' },
  { px: 32, name: 'icon_16x16@2x.png' },
  { px: 32, name: 'icon_32x32.png' },
  { px: 64, name: 'icon_32x32@2x.png' },
  { px: 128, name: 'icon_128x128.png' },
  { px: 256, name: 'icon_128x128@2x.png' },
  { px: 256, name: 'icon_256x256.png' },
  { px: 512, name: 'icon_256x256@2x.png' },
  { px: 512, name: 'icon_512x512.png' },
  { px: 1024, name: 'icon_512x512@2x.png' },
];

for (const { px, name } of sizes) {
  const outPng = path.resolve(iconsetDir, name);
  run('sips', ['-z', String(px), String(px), srcPng, '--out', outPng]);
}

run('iconutil', ['-c', 'icns', iconsetDir, '-o', outIcns]);
console.log(`[icons] wrote ${outIcns}`);

