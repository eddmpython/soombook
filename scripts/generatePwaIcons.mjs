import { mkdir, readFile } from 'node:fs/promises';
import path from 'node:path';

import { chromium } from '@playwright/test';

const ROOT = path.resolve(import.meta.dirname, '..');
const PUBLIC_ROOT = path.join(ROOT, 'apps', 'reader-web', 'public');
const SOURCE_PATH = path.join(PUBLIC_ROOT, 'soombook-mark.svg');
const svg = await readFile(SOURCE_PATH, 'utf8');

await mkdir(PUBLIC_ROOT, { recursive: true });
const browser = await chromium.launch();
try {
  for (const size of [192, 512]) {
    const page = await browser.newPage({ viewport: { width: size, height: size } });
    await page.setContent(
      `<style>html,body{margin:0;width:100%;height:100%;overflow:hidden}svg{display:block;width:100%;height:100%}</style>${svg}`,
    );
    await page.screenshot({
      path: path.join(PUBLIC_ROOT, `soombook-mark-${size}.png`),
      omitBackground: true,
    });
    await page.close();
  }
} finally {
  await browser.close();
}

console.log('PWA 아이콘 생성 완료: 192px, 512px');
