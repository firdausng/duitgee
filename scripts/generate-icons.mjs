// One-shot rasterizer: turns static/icon.svg into the PNG variants needed by
// iOS home-screen and PWA installers. Re-run any time the SVG changes:
//
//     pnpm exec node scripts/generate-icons.mjs
//
// Uses Playwright's bundled Chromium (already a devDependency for E2E tests).

import { chromium } from 'playwright';
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');
const sourceSvg = resolve(root, 'static/icon.svg');

const targets = [
    // iOS home-screen — Apple ignores transparency, so paint cream paper behind.
    { out: 'static/apple-touch-icon.png', size: 180, bg: '#F2EADC' },
    // PWA — transparent so the OS launcher can mask/round.
    { out: 'static/icon-192.png', size: 192, bg: 'transparent' },
    { out: 'static/icon-512.png', size: 512, bg: 'transparent' },
];

const svg = await readFile(sourceSvg, 'utf8');

const browser = await chromium.launch();
const page = await browser.newPage();

for (const { out, size, bg } of targets) {
    const html = `<!doctype html><html><head><style>
        html, body { margin: 0; padding: 0; background: ${bg}; }
        svg { display: block; width: ${size}px; height: ${size}px; }
    </style></head><body>${svg}</body></html>`;

    await page.setViewportSize({ width: size, height: size });
    await page.setContent(html, { waitUntil: 'networkidle' });

    const buffer = await page.screenshot({
        type: 'png',
        omitBackground: bg === 'transparent',
        clip: { x: 0, y: 0, width: size, height: size },
    });

    await writeFile(resolve(root, out), buffer);
    console.log(`✓ ${out} (${size}×${size})`);
}

await browser.close();
