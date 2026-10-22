import { test } from 'node:test';
import assert from 'node:assert/strict';
import { shareLink, sharePayload } from './nativeShare.ts';

for (const kind of ['invitation', 'announcement'] as const) {
  test(`${kind}: native handoff includes title, message and unchanged public URL`, async () => {
    const url = `https://thefamilyweather.com/${kind === 'invitation' ? 'invitation' : 'a'}/abc123`;
    const payload = sharePayload(kind, 'Family lunch 💛', url);
    let called = false;
    const pending = shareLink({ share: async data => {
      called = true;
      assert.equal(data.url, url);
      assert.equal(data.title, 'Family lunch 💛');
      assert.ok(data.text.includes(data.title));
      assert.match(data.text, kind === 'invitation' ? /RSVP/ : /reply/);
      assert.deepEqual(Object.keys(data).sort(), ['text', 'title', 'url']);
    } }, payload);
    assert.equal(called, true, 'native sharing starts synchronously in the click handler');
    assert.equal(await pending, 'shared');
  });
}
test('unsupported desktop provides fallback', async () => {
  assert.equal(await shareLink({}, sharePayload('invitation', 'Lunch', 'https://example.com')), 'unavailable');
});
test('cancelling native sharing does not report failure or copy anything', async () => {
  assert.equal(await shareLink({share: async () => { throw {name: 'AbortError'}; }}, sharePayload('invitation','Lunch','https://example.com')), 'cancelled');
});
test('blocked sharing provides fallback', async () => {
  assert.equal(await shareLink({share: async () => { throw {name: 'NotAllowedError'}; }}, sharePayload('invitation','Lunch','https://example.com')), 'unavailable');
});
