const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.join(__dirname, '..');
const mobile = fs.readFileSync(path.join(root, 'mobile/src/screens.tsx'), 'utf8');
const designs = fs.readFileSync(path.join(root, 'app/announcements/designs.ts'), 'utf8');

test('mobile announcements use the website catalog, preview, and selected theme', () => {
  const designIds = [...designs.matchAll(/\{ id: '([^']+)'/g)].map(match => match[1]);
  assert.equal(designIds.length, 15);
  assert.match(mobile, /import \{ announcementDesigns \} from "\.\.\/\.\.\/app\/announcements\/designs"/);
  assert.match(mobile, /import AnnouncementCard from "\.\.\/\.\.\/app\/announcements\/AnnouncementCard"/);
  assert.match(mobile, /announcementDesigns\.map\(design =>/);
  assert.match(mobile, /<AnnouncementCard theme=\{theme\}/);
  assert.match(mobile, /data: \{ title: nextTitle, message: nextMessage, theme: nextTheme \}/);
  assert.doesNotMatch(mobile, /data: \{ title: nextTitle, message: nextMessage, theme: "forest" \}/);
});
