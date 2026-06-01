import sharp from 'sharp';

const BG = '#0B0E14';
const BOLT = 'M13 2 L4 14 L11 14 L11 22 L20 10 L13 10 Z';

// accent key -> [hex, fileSuffix]
const accents = {
  default: '#22D3A7',
  blue: '#60A5FA',
  orange: '#FB923C',
  pink: '#F472B6',
  violet: '#A78BFA',
  yellow: '#FACC15',
};

function iosSvg(color) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
  <rect width="1024" height="1024" fill="${BG}"/>
  <g transform="translate(176,176) scale(28)">
    <path d="${BOLT}" fill="${color}"/>
  </g>
</svg>`;
}

function fgSvg(color) {
  // Transparent background, smaller bolt inside the Android adaptive safe zone.
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
  <g transform="translate(248,248) scale(22)">
    <path d="${BOLT}" fill="${color}"/>
  </g>
</svg>`;
}

const dir = '/home/user/Fuel/assets';
for (const [key, color] of Object.entries(accents)) {
  const iconName = key === 'default' ? 'icon.png' : `icon-${key}.png`;
  const fgName = key === 'default' ? 'adaptive-icon.png' : `adaptive-${key}.png`;
  // iOS icons must be opaque (App Store rejects an alpha channel).
  await sharp(Buffer.from(iosSvg(color)))
    .flatten({ background: BG })
    .removeAlpha()
    .png()
    .toFile(`${dir}/${iconName}`);
  // Android adaptive foregrounds keep transparency.
  await sharp(Buffer.from(fgSvg(color))).png().toFile(`${dir}/${fgName}`);
  console.log('wrote', iconName, fgName);
}
// Splash icon: bolt on transparent for the splash screen too.
await sharp(Buffer.from(fgSvg(accents.default))).png().toFile(`${dir}/splash-icon.png`);
console.log('done');
