import { cp, mkdir, access } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

// Model face-api (~6 MB) tidak di-bundle, tapi dilayani sebagai aset statis.
// Menyalinnya di postinstall supaya `npm install` selalu menyelesaikannya.
const root = path.dirname(fileURLToPath(import.meta.url));
const asal = path.join(root, '..', 'node_modules', '@vladmandic', 'face-api', 'model');
const tujuan = path.join(root, '..', 'public', 'models');

try {
  await access(asal);
} catch {
  console.warn('[models] Lewati: @vladmandic/face-api/model tidak ditemukan.');
  process.exit(0);
}

await mkdir(tujuan, { recursive: true });
await cp(asal, tujuan, { recursive: true });
console.log('[models] Model face-api disalin ke public/models');