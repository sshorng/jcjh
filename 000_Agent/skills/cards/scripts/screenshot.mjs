// 社群圖卡截圖腳本（by 雷小蒙）
// 用法：node scripts/screenshot.mjs <output-folder>
// 會把資料夾內所有 .html（除了 preview.html）截成 2x PNG，最後刪除 HTML 只留 PNG

import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { chromium } = require('C:/Users/sshor/.gemini/antigravity/skills-dependency/cards/node_modules/playwright');
import { readdirSync, unlinkSync } from 'fs';
import { resolve } from 'path';

const dir = process.argv[2];
if (!dir) { console.error('Usage: node screenshot.mjs <folder>'); process.exit(1); }

const files = readdirSync(dir).filter(f => f.endsWith('.html') && f !== 'preview.html').sort();
console.log(`Found ${files.length} HTML files in ${dir}`);

const browser = await chromium.launch();
const context = await browser.newContext({ deviceScaleFactor: 2 });

for (const file of files) {
  const page = await context.newPage();
  await page.goto('file://' + resolve(dir, file));
  await page.waitForTimeout(2500);
  const card = await page.$('.card');
  const pngName = file.replace('.html', '.png');
  await card.screenshot({ path: resolve(dir, pngName) });
  await page.close();
  console.log(`✅ ${pngName}`);
}

await browser.close();

for (const file of [...files, 'preview.html']) {
  try { unlinkSync(resolve(dir, file)); } catch {}
}

console.log(`\n全部匯出完成！${files.length} 張 2x PNG 在 ${dir}/`);
