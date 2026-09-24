// Generates public/og-image.png, the 1200x630 link-preview image referenced
// by the og:image / twitter:image tags in index.html.
//
// The app icon tile (from logomark.mjs) sits above the wordmark.
//
// Fonts are NOT committed to the repo. Render with the real OFL font files:
//
//   OG_FRAUNCES_FONT    static Fraunces Medium Italic (wght 500, opsz 144) TTF
//   OG_PLEX_MONO_FONT   IBM Plex Mono Medium TTF
//
// If unset, both default to files in $TMPDIR/commonplace-og-fonts/
// (Fraunces-MediumItalic.ttf, IBMPlexMono-Medium.ttf). Fraunces is only
// published as a variable font, so make the static instance with fontTools:
//
//   mkdir -p /tmp/commonplace-og-fonts && cd /tmp/commonplace-og-fonts
//   curl -sSLo Fraunces-Italic-VF.ttf \
//     "https://raw.githubusercontent.com/google/fonts/main/ofl/fraunces/Fraunces-Italic%5BSOFT,WONK,opsz,wght%5D.ttf"
//   curl -sSLo IBMPlexMono-Medium.ttf \
//     https://raw.githubusercontent.com/google/fonts/main/ofl/ibmplexmono/IBMPlexMono-Medium.ttf
//   pip install fonttools
//   fonttools varLib.instancer Fraunces-Italic-VF.ttf wght=500 opsz=144 SOFT=0 WONK=1 \
//     -o Fraunces-MediumItalic.ttf
//
// Then: node scripts/gen-og-image.mjs
import { existsSync, mkdtempSync, copyFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const defaultFontDir = join(tmpdir(), 'commonplace-og-fonts');
const frauncesPath =
  process.env.OG_FRAUNCES_FONT || join(defaultFontDir, 'Fraunces-MediumItalic.ttf');
const plexMonoPath =
  process.env.OG_PLEX_MONO_FONT || join(defaultFontDir, 'IBMPlexMono-Medium.ttf');

for (const path of [frauncesPath, plexMonoPath]) {
  if (!existsSync(path)) {
    console.error(`Missing font file: ${path}\nSee the header of this script for setup.`);
    process.exit(1);
  }
}

// Point fontconfig at a private directory holding only these two fonts, so
// a missing or misnamed font fails visibly instead of silently falling back
// to a system serif. Must be set before sharp (libvips/librsvg) loads.
const fontDir = mkdtempSync(join(tmpdir(), 'og-fontconfig-'));
copyFileSync(frauncesPath, join(fontDir, 'Fraunces-MediumItalic.ttf'));
copyFileSync(plexMonoPath, join(fontDir, 'IBMPlexMono-Medium.ttf'));
const fontsConf = join(fontDir, 'fonts.conf');
writeFileSync(
  fontsConf,
  `<?xml version="1.0"?>
<!DOCTYPE fontconfig SYSTEM "fonts.dtd">
<fontconfig>
  <dir>${fontDir}</dir>
  <cachedir>${join(fontDir, 'cache')}</cachedir>
</fontconfig>
`
);
process.env.FONTCONFIG_FILE = fontsConf;

const { default: sharp } = await import('sharp');
const { LIGHT, S, tileElements } = await import('./logomark.mjs');

const WIDTH = 1200;
const HEIGHT = 630;
const BONE = '#EAE4D6';
const WINE = '#8C4444';
const MUTED = '#6B6357';

// Icon tile, centred above the wordmark. The tile is bone like the page,
// so a hairline edge and a soft shadow keep it reading as an app icon.
const TILE = 132;
const TILE_TOP = 140;
const TILE_LEFT = (WIDTH - TILE) / 2;
const TILE_EDGE = '#D8D0BC';

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">
  <defs>
    <filter id="tile-shadow" x="-20%" y="-20%" width="140%" height="150%">
      <feDropShadow dx="0" dy="${S * 0.02}" stdDeviation="${S * 0.03}" flood-color="#2A2622" flood-opacity="0.14"/>
    </filter>
  </defs>
  <rect width="100%" height="100%" fill="${BONE}"/>
  <g transform="translate(${TILE_LEFT} ${TILE_TOP}) scale(${TILE / S})">
    <g filter="url(#tile-shadow)">${tileElements(LIGHT, { rounded: true })}</g>
    <rect x="1" y="1" width="${S - 2}" height="${S - 2}" rx="111" fill="none" stroke="${TILE_EDGE}" stroke-width="4"/>
  </g>
  <text x="${WIDTH / 2}" y="406" text-anchor="middle"
        font-family="Fraunces" font-style="italic" font-weight="500" font-size="124"
        fill="${WINE}">commonplace</text>
  <text x="${WIDTH / 2}" y="482" text-anchor="middle"
        font-family="IBM Plex Mono" font-weight="500" font-size="28" letter-spacing="5.6"
        fill="${MUTED}">READING · WATCHING · LISTENING</text>
</svg>`;

const outPath = fileURLToPath(new URL('../public/og-image.png', import.meta.url));

await sharp(Buffer.from(svg), { density: 72 })
  // The background rect is opaque; drop the alpha channel so the PNG is
  // plain RGB (smaller, and no preview renderer can show it transparent).
  .removeAlpha()
  .png({ compressionLevel: 9 })
  .toFile(outPath);

rmSync(fontDir, { recursive: true, force: true });
console.log('wrote public/og-image.png');
