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
//
// Run: node scripts/gen-icons.mjs
import sharp from 'sharp';
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import {
  C_PATH,
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
