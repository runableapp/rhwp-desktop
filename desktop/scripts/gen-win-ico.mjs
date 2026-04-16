import fs from 'node:fs/promises';
import path from 'node:path';
import pngToIco from 'png-to-ico';

const desktopDir = path.resolve(import.meta.dirname, '..');
const pngPath = path.resolve(desktopDir, 'build-resources', 'icon.png');
const icoPath = path.resolve(desktopDir, 'build-resources', 'icon.ico');

const buf = await fs.readFile(pngPath);
const ico = await pngToIco(buf);
await fs.writeFile(icoPath, ico);
console.log(`[icons] wrote ${icoPath}`);

