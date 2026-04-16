import fs from 'node:fs/promises';
import path from 'node:path';

const desktopDir = path.resolve(import.meta.dirname, '..');
const srcPng = path.resolve(desktopDir, '..', 'resources', 'logo-256.png');
const outDir = path.resolve(desktopDir, 'build-resources');
const outPng = path.resolve(outDir, 'icon.png');

await fs.mkdir(outDir, { recursive: true });
await fs.copyFile(srcPng, outPng);
console.log(`[icons] copied ${srcPng} -> ${outPng}`);

