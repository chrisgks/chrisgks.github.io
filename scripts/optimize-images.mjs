// One-off: generate web-optimized WebP next to the full-res PNG masters in
// public/images. Masters stay untouched. Re-run if you add/replace art.
//   node scripts/optimize-images.mjs
import sharp from 'sharp';
import { readdirSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = join(dirname(fileURLToPath(import.meta.url)), '../public/images');
const MAX_W = 1400; // displayed at <=600px, so 1400 is crisp on any screen
let before = 0, after = 0;

for (const f of readdirSync(dir).filter((f) => /\.png$/i.test(f))) {
	const src = join(dir, f);
	const out = src.replace(/\.png$/i, '.webp');
	before += statSync(src).size;
	await sharp(src).resize({ width: MAX_W, withoutEnlargement: true }).webp({ quality: 88, effort: 6 }).toFile(out);
	after += statSync(out).size;
	console.log(`${f} -> ${(statSync(out).size / 1024).toFixed(0)} KB`);
}
console.log(`\nTOTAL: ${(before / 1024 / 1024).toFixed(1)} MB PNG  ->  ${(after / 1024 / 1024).toFixed(1)} MB WebP`);
