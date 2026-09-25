// The CommonPlace logomark, shared by gen-icons.mjs and gen-og-image.mjs:
// an italic Fraunces "c" (outlined to a path, so no font is needed) with a
// wine ribbon bookmark hanging from the top edge of a rounded bone tile.
// CEO pick, 2026-09 ("Option 2").

export const LIGHT = { bg: '#EAE4D6', ribbon: '#8C4444', ink: '#2A2622' };
export const DARK = { bg: '#1C1A17', ribbon: '#C47A7A', ink: '#EDE8DD' };

// All geometry is on a 512x512 canvas. Fraunces Bold Italic "c", outlined.
export const C_PATH =
  'M258.9 209.7Q247.5 209.7 236.3 220Q225.1 230.2 216.1 249.2Q207.2 268.2 203.5 295Q197.3 338.9 209 359.7Q220.7 380.5 245.4 380.5Q255.8 380.5 265.1 376.6Q274.5 372.7 282.9 365.3Q291.4 357.8 297.9 347.2Q305.7 338.4 310.2 333.8Q314.8 329.3 321 329.5Q327.5 329.8 330.8 336.3Q334 342.8 330.6 355.3Q326.2 371.1 316.1 385.4Q305.9 399.7 290.2 410.6Q274.5 421.5 253.1 427.8Q231.6 434 204.8 434Q151.8 434 126.4 402.6Q100.9 371.1 108.7 314.4Q112.8 285.9 125.8 261.2Q138.8 236.5 159.9 217.8Q180.9 199.1 208.9 188.5Q236.8 178 270.3 178Q299.2 178 317.8 187.9Q336.4 197.8 345.3 213.2Q354.3 228.7 353 246.4Q351.9 268.2 337.4 280.1Q322.8 292.1 305.7 292.1Q289.3 292.1 280.6 284.6Q271.9 277 272.2 265.1Q272.4 256 275 248.3Q277.6 240.6 277.6 231Q277.9 221.7 273.1 215.7Q268.3 209.7 258.9 209.7Z';

// Ribbon: flat top, V-notch at the bottom (same silhouette as the app's
// pin icon). x/width/bottom/notch in 512 units.
export function ribbonPath({ x, width, top, bottom, notch }) {
  return `M${x} ${top}H${x + width}V${bottom}L${x + width / 2} ${bottom - notch}L${x} ${bottom}Z`;
}

// The standard mark: ribbon hangs from the very top edge of the tile.
export const HANGING_RIBBON = ribbonPath({ x: 322, width: 92, top: 0, bottom: 156, notch: 34 });

// Maskable: the ribbon can't touch the top edge (a circle mask would cut
// it into an odd tab), so it's shorter and starts below the top, and the
// whole mark is scaled down about its centre to sit inside the safe zone
// (a circle of radius 0.4 * size).
export const MASKABLE_RIBBON = ribbonPath({ x: 326, width: 80, top: 48, bottom: 156, notch: 30 });
export const MASKABLE_SCALE = 0.8;
export const MASKABLE_CENTER = { x: 257, y: 243 };
// Visible width of that mark (left of the "c" to right of the ribbon),
// in 512 units, for sizing it on the iOS launch screens.
export const MASK_MARK_WIDTH = 300;

export const S = 512;
export const TILE_RADIUS = 112;

// The tile's shapes on the 512x512 canvas, without the <svg> wrapper, so
// they can be embedded (e.g. in the link-preview image).
export function tileElements(colors, { rounded }) {
  const rx = rounded ? ` rx="${TILE_RADIUS}"` : '';
  return `<rect width="${S}" height="${S}"${rx} fill="${colors.bg}"/>
  <path fill="${colors.ribbon}" d="${HANGING_RIBBON}"/>
  <path fill="${colors.ink}" d="${C_PATH}"/>`;
}

export function tileSvg(colors, { rounded }) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${S} ${S}" width="${S}" height="${S}">
  ${tileElements(colors, { rounded })}
</svg>
`;
}
