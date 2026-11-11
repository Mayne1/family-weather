const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const sharp = require('sharp');
const root = path.join(__dirname, '..');
const read = p => fs.readFileSync(path.join(root, p));
test('canonical artwork remains the exact approved source and SVG embeds it unchanged', () => {
  const source = read('public/brand/family-weather-logo.jpg');
  assert.equal(crypto.createHash('sha256').update(source).digest('hex'), '427b8edc0b855b991b2be240ced80a9f17a5ecc9b635bb71ef869cb821a80949');
  assert.ok(read('app/icon.svg').toString().includes(source.toString('base64')));
});
test('native and web icon dimensions match their manifests', async () => {
  const expected = [
    ['public/notification-icon-192.png',192], ['public/notification-icon-512.png',512],
    ['public/brand/apple-touch-icon.png',180],
    ['ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png',1024],
  ];
  for (const [density,size,foreground] of [['mdpi',48,108],['hdpi',72,162],['xhdpi',96,216],['xxhdpi',144,324],['xxxhdpi',192,432]]) {
    for (const name of ['ic_launcher', 'ic_launcher_round']) expected.push([`android/app/src/main/res/mipmap-${density}/${name}.png`,size]);
    expected.push([`android/app/src/main/res/mipmap-${density}/ic_launcher_foreground.png`,foreground]);
  }
  for (const [file,size] of expected) {
    const metadata = await sharp(read(file)).metadata();
    assert.equal(metadata.width,size,file); assert.equal(metadata.height,size,file);
    if (file.startsWith('ios/')) assert.equal(metadata.hasAlpha,false,'iOS icon must be opaque');
  }
});
test('ICO contains four valid PNG image entries', () => {
  const ico = read('app/favicon.ico');
  assert.equal(ico.readUInt16LE(2),1); assert.equal(ico.readUInt16LE(4),4);
  for (let i=0;i<4;i++) {
    const offset=ico.readUInt32LE(6+i*16+12), length=ico.readUInt32LE(6+i*16+8);
    assert.ok(offset+length<=ico.length); assert.equal(ico.subarray(offset+1,offset+4).toString(),'PNG');
    assert.equal(ico[offset+25],6,'ICO PNG color type must be RGBA for Turbopack');
  }
});
test('all native launch screens preserve dimensions and contain the canonical center artwork', async () => {
  const assets = [
    ['android/app/src/main/res/drawable/splash.png',480,320],
    ...[['mdpi',480,320],['hdpi',800,480],['xhdpi',1280,720],['xxhdpi',1600,960],['xxxhdpi',1920,1280]]
      .flatMap(([density,width,height]) => [
        [`android/app/src/main/res/drawable-land-${density}/splash.png`,width,height],
        [`android/app/src/main/res/drawable-port-${density}/splash.png`,height,width],
      ]),
    ...['splash-2732x2732.png','splash-2732x2732-1.png','splash-2732x2732-2.png']
      .map(name => [`ios/App/App/Assets.xcassets/Splash.imageset/${name}`,2732,2732]),
  ];
  for (const [file,width,height] of assets) {
    const image = read(file);
    const metadata = await sharp(image).metadata();
    assert.equal(metadata.width,width,file); assert.equal(metadata.height,height,file);
    const size = Math.round(Math.min(width,height)*0.3);
    const actual = await sharp(image).extract({left:Math.floor((width-size)/2),top:Math.floor((height-size)/2),width:size,height:size}).removeAlpha().raw().toBuffer();
    const expected = await sharp(read('public/brand/family-weather-logo.jpg')).resize(size,size).removeAlpha().raw().toBuffer();
    assert.deepEqual(actual,expected,file);
  }
});
test('Android launcher references mipmap artwork, not unused drawable vectors', () => {
  for (const name of ['ic_launcher','ic_launcher_round']) {
    const adaptive = read(`android/app/src/main/res/mipmap-anydpi-v26/${name}.xml`).toString();
    assert.ok(adaptive.includes('@mipmap/ic_launcher_foreground'));
    assert.ok(!adaptive.includes('@drawable/ic_launcher_foreground'));
  }
  const manifest=read('android/app/src/main/AndroidManifest.xml').toString();
  assert.ok(manifest.includes('android:icon="@mipmap/ic_launcher"'));
  assert.ok(manifest.includes('android:roundIcon="@mipmap/ic_launcher_round"'));
});
