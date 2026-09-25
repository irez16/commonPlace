// Generates the app icon set from the logomark (see logomark.mjs): an
// italic Fraunces "c" with a wine ribbon bookmark hanging from the top edge.
//
// Writes:
//   public/favicon.svg                 rounded tile, follows the browser's
//                                      light/dark preference
//   public/icons/icon-{192,512}.png    "any" purpose: rounded tile,
//                                      transparent corners
//   public/icons/icon-maskable-*.png   full-bleed bone square with the mark
//                                      (and a shorter ribbon) inside the
//                                      central 80% safe zone, so a circle or
//                                      squircle mask never clips it
//   public/icons/apple-touch-icon.png  full-bleed bone square (iOS rounds
//                                      the corners itself; no transparency)
//   public/icons/favicon-{16,32}.png   PNG fallbacks for the SVG favicon
//   public/splash/apple-splash-*.png   iOS launch screens for the installed
//                                      app (bone background, mark centred);
//                                      linked from index.html, one per
//                                      iPhone screen size in SPLASH_SIZES
//
// Run: node scripts/gen-icons.mjs
import sharp from 'sharp';
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import {
  C_PATH,
  MASK_MARK_WIDTH,
  DARK,
  HANGING_RIBBON,
  LIGHT,
  MASKABLE_CENTER,
  MASKABLE_RIBBON,
  MASKABLE_SCALE,
  S,
  TILE_RADIUS,
  tileSvg,
} from './logomark.mjs';

function maskableSvg(colors) {
  const { x, y } = MASKABLE_CENTER;
  // Scale about the mark's centre, then put that centre at the canvas centre.
  const transform = `translate(${S / 2} ${S / 2}) scale(${MASKABLE_SCALE}) translate(${-x} ${-y})`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${S} ${S}" width="${S}" height="${S}">
  <rect width="${S}" height="${S}" fill="${colors.bg}"/>
  <g transform="${transform}">
    <path fill="${colors.ribbon}" d="${MASKABLE_RIBBON}"/>
    <path fill="${colors.ink}" d="${C_PATH}"/>
  </g>
</svg>
`;
}

// The browser-tab favicon. Presentation attributes carry the light colours
// (for renderers without CSS); the style block switches to the dark
// palette when the browser prefers dark.
function faviconSvg() {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${S} ${S}" width="${S}" height="${S}">
  <title>CommonPlace</title>
  <style>
    @media (prefers-color-scheme: dark) {
      .bg { fill: ${DARK.bg}; }
      .ribbon { fill: ${DARK.ribbon}; }
      .ink { fill: ${DARK.ink}; }
    }
  </style>
  <rect class="bg" width="${S}" height="${S}" rx="${TILE_RADIUS}" fill="${LIGHT.bg}"/>
  <path class="ribbon" fill="${LIGHT.ribbon}" d="${HANGING_RIBBON}"/>
  <path class="ink" fill="${LIGHT.ink}" d="${C_PATH}"/>
</svg>
`;
}

const publicDir = fileURLToPath(new URL('../public/', import.meta.url));
const iconsDir = fileURLToPath(new URL('../public/icons/', import.meta.url));
mkdirSync(iconsDir, { recursive: true });

writeFileSync(publicDir + 'favicon.svg', faviconSvg());
console.log('wrote favicon.svg');

async function render(svg, size, name, { opaque }) {
  // Rasterised at the SVG's native 512px, then downsampled.
  let image = sharp(Buffer.from(svg)).resize(size, size);
  // Opaque icons drop the alpha channel so nothing can show through.
  if (opaque) image = image.removeAlpha();
  await image.png({ compressionLevel: 9 }).toFile(iconsDir + name);
  console.log('wrote', name);
}

const rounded = tileSvg(LIGHT, { rounded: true });
const square = tileSvg(LIGHT, { rounded: false });
const maskable = maskableSvg(LIGHT);

await render(rounded, 192, 'icon-192.png', { opaque: false });
await render(rounded, 512, 'icon-512.png', { opaque: false });
await render(maskable, 192, 'icon-maskable-192.png', { opaque: true });
await render(maskable, 512, 'icon-maskable-512.png', { opaque: true });
await render(square, 180, 'apple-touch-icon.png', { opaque: true });
await render(rounded, 32, 'favicon-32.png', { opaque: false });
await render(rounded, 16, 'favicon-16.png', { opaque: false });

// iOS launch screens (apple-touch-startup-image). iOS only uses one whose
// media query matches the device exactly, so there's one per iPhone screen
// size, portrait. Keep this list in sync with the <link> tags in
// index.html. [CSS width, CSS height, device pixel ratio]
export const SPLASH_SIZES = [
  [440, 956, 3], // iPhone 16 Pro Max
  [402, 874, 3], // iPhone 16 Pro
  [430, 932, 3], // iPhone 14 Pro Max, 15 Plus / Pro Max, 16 Plus
  [393, 852, 3], // iPhone 14 Pro, 15, 15 Pro, 16
  [428, 926, 3], // iPhone 12 / 13 Pro Max, 14 Plus
  [390, 844, 3], // iPhone 12, 12 Pro, 13, 13 Pro, 14
  [375, 812, 3], // iPhone X, XS, 11 Pro, 12 mini, 13 mini
  [414, 896, 3], // iPhone XS Max, 11 Pro Max
  [414, 896, 2], // iPhone XR, 11
  [375, 667, 2], // iPhone SE (2nd/3rd gen), 6/7/8
];

// The mark on a bone background, full-bleed: the maskable variant's
// shapes (shorter ribbon that doesn't need a tile edge to hang from),
// scaled so the mark is about a quarter of the screen width.
function splashSvg(width, height) {
  const { x, y } = MASKABLE_CENTER;
  const scale = (width / 4) / MASK_MARK_WIDTH;
  const transform = `translate(${width / 2} ${height / 2}) scale(${scale}) translate(${-x} ${-y})`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">
  <rect width="${width}" height="${height}" fill="${LIGHT.bg}"/>
  <g transform="${transform}">
    <path fill="${LIGHT.ribbon}" d="${MASKABLE_RIBBON}"/>
    <path fill="${LIGHT.ink}" d="${C_PATH}"/>
  </g>
</svg>
`;
}

const splashDir = fileURLToPath(new URL('../public/splash/', import.meta.url));
mkdirSync(splashDir, { recursive: true });
for (const [w, h, dpr] of SPLASH_SIZES) {
  const width = w * dpr;
  const height = h * dpr;
  const name = `apple-splash-${width}x${height}.png`;
  // Palette PNG: the image is three flat colours plus anti-aliasing, so
  // this keeps each file a few KB instead of hundreds.
  await sharp(Buffer.from(splashSvg(width, height)))
    .png({ palette: true, colors: 32, compressionLevel: 9 })
    .toFile(splashDir + name);
  console.log('wrote splash/' + name);
}
