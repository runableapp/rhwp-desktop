import fs from 'node:fs/promises';
import path from 'node:path';

const desktopDir = path.resolve(import.meta.dirname, '..');
const outDir = path.resolve(desktopDir, 'build-resources');
const outPng = path.resolve(outDir, 'icon.png');

await fs.mkdir(outDir, { recursive: true });

const candidates = [
  // Preferred: tracked build resource already in place (CI-safe)
  path.resolve(desktopDir, 'build-resources', 'icon.png'),
  // Fallback: project-level resource (often untracked in CI)
  path.resolve(desktopDir, '..', 'resources', 'logo-256.png'),
];

async function exists(p) {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

const srcPng = (await (async () => {
  for (const p of candidates) {
    if (await exists(p)) return p;
  }
  return null;
})());

if (!srcPng) {
  throw new Error(
    `[icons] no source PNG found. Expected one of:\n` +
      candidates.map((p) => `- ${p}`).join('\n') +
      `\n\nFix: add/commit an icon PNG (recommended: desktop/build-resources/icon.png).`,
  );
}

if (path.resolve(srcPng) !== path.resolve(outPng)) {
  await fs.copyFile(srcPng, outPng);
  console.log(`[icons] copied ${srcPng} -> ${outPng}`);
} else {
  console.log(`[icons] using existing ${outPng}`);
}

