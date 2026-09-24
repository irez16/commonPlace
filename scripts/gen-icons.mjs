import sharp from 'sharp';
import { readFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const svg = readFileSync(new URL('../public/favicon.svg', import.meta.url));
const BONE = '#EAE4D6';
const iconsDir = fileURLToPath(new URL('../public/icons/', import.meta.url));

mkdirSync(iconsDir, { recursive: true });

async function makeIcon({ name, size, padding, background, squareBg }) {
  const logoSize = Math.round(size * (1 - padding * 2));
  // favicon viewBox is 48x46 (not square) — fit within logoSize box preserving aspect
  const w = logoSize;
  const h = Math.round(logoSize * (46 / 48));
  const logo = await sharp(svg, { density: 1200 })
    .resize(w, h, { fit: 'contain' })
    .toBuffer();

  let canvas = sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: squareBg ? background : { r: 0, g: 0, b: 0, alpha: 0 },
    },
  });

  const left = Math.round((size - w) / 2);
  const top = Math.round((size - h) / 2);

  await canvas
    .composite([{ input: logo, left, top }])
    .png()
    .toFile(iconsDir + name);
  console.log('wrote', name);
}

const jobs = [
  // Standard "any" purpose icons — transparent background, logo fills most of the frame
  { name: 'icon-192.png', size: 192, padding: 0.12, squareBg: false },
  { name: 'icon-512.png', size: 512, padding: 0.12, squareBg: false },
  // Maskable icons — opaque bone background, generous safe-zone padding
  { name: 'icon-maskable-192.png', size: 192, padding: 0.25, background: BONE, squareBg: true },
  { name: 'icon-maskable-512.png', size: 512, padding: 0.25, background: BONE, squareBg: true },
  // iOS home screen icon — opaque, no transparency, iOS applies its own rounding
  { name: 'apple-touch-icon.png', size: 180, padding: 0.16, background: BONE, squareBg: true },
  // Browser favicon PNG fallbacks
  { name: 'favicon-32.png', size: 32, padding: 0.06, squareBg: false },
  { name: 'favicon-16.png', size: 16, padding: 0.04, squareBg: false },
];

for (const job of jobs) {
  await makeIcon(job);
}
