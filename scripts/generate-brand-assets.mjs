// Exact approved artwork; resize/pad only. Run from repository root after npm ci.
import sharp from 'sharp';
import { readFile, writeFile } from 'node:fs/promises';
const source = 'public/brand/family-weather-logo.jpg';
const input = await readFile(source);
const png = size => sharp(input).resize(size, size).png().toBuffer();
for (const size of [192, 512]) await writeFile(`public/notification-icon-${size}.png`, await png(size));
await writeFile('public/brand/apple-touch-icon.png', await png(180));
await writeFile('ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png', await png(1024));
// An embedded source keeps the SVG favicon self-contained, without redrawing the logo.
await writeFile('app/icon.svg', `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024"><title>Family Weather</title><image width="1024" height="1024" href="data:image/jpeg;base64,${input.toString('base64')}"/></svg>\n`);
// ICO supports embedded PNG images, including a 256px image for high-density displays.
const sizes = [16, 32, 48, 256];
// Turbopack's ICO decoder requires embedded PNG entries to use RGBA.
const images = await Promise.all(sizes.map(size => sharp(input).resize(size, size).ensureAlpha().png().toBuffer()));
const header = Buffer.alloc(6 + sizes.length * 16);
header.writeUInt16LE(1, 2); header.writeUInt16LE(sizes.length, 4);
let offset = header.length;
images.forEach((image, i) => {
  const entry = 6 + i * 16;
  header[entry] = sizes[i] % 256; header[entry + 1] = sizes[i] % 256;
  header.writeUInt16LE(1, entry + 4); header.writeUInt16LE(32, entry + 6);
  header.writeUInt32LE(image.length, entry + 8); header.writeUInt32LE(offset, entry + 12);
  offset += image.length;
});
await writeFile('app/favicon.ico', Buffer.concat([header, ...images]));
for (const [density, size, foreground] of [['mdpi',48,108],['hdpi',72,162],['xhdpi',96,216],['xxhdpi',144,324],['xxxhdpi',192,432]]) {
  const directory = `android/app/src/main/res/mipmap-${density}`;
  await writeFile(`${directory}/ic_launcher.png`, await png(size));
  await writeFile(`${directory}/ic_launcher_round.png`, await png(size));
  // Keep all of the canonical artwork inside the adaptive icon's central safe area.
  const insetSize = Math.round(foreground * 66 / 108);
  const inset = await png(insetSize);
  await sharp({create:{width:foreground,height:foreground,channels:4,background:'#063b31'}})
    .composite([{input:inset,gravity:'centre'}]).png().toFile(`${directory}/ic_launcher_foreground.png`);
}
// Preserve the launch-screen resource dimensions and center the unmodified source.
const splashAssets = [
  ['android/app/src/main/res/drawable/splash.png',480,320],
  ...[['mdpi',480,320],['hdpi',800,480],['xhdpi',1280,720],['xxhdpi',1600,960],['xxxhdpi',1920,1280]]
    .flatMap(([density,width,height]) => [
      [`android/app/src/main/res/drawable-land-${density}/splash.png`,width,height],
      [`android/app/src/main/res/drawable-port-${density}/splash.png`,height,width],
    ]),
  ...['splash-2732x2732.png','splash-2732x2732-1.png','splash-2732x2732-2.png']
    .map(name => [`ios/App/App/Assets.xcassets/Splash.imageset/${name}`,2732,2732]),
];
for (const [file,width,height] of splashAssets) {
  const logo = await png(Math.round(Math.min(width,height) * 0.3));
  await sharp({create:{width,height,channels:3,background:'#063b31'}})
    .composite([{input:logo,gravity:'centre'}]).png().toFile(file);
}
console.log('Canonical web, iOS, and Android brand assets and launch screens generated.');
