import { test } from 'node:test';
import assert from 'node:assert/strict';
import { supportsAdvertising, validAdSlot } from './adPolicy.ts';
import { weatherStories } from '../weather-stories/stories.ts';

test('public weather, planning and editorial pages carry advertising', () => {
  for (const path of ['/', '/today', '/live', '/plan', '/weather-history', '/how-it-works', '/about', '/pricing', '/faq', '/weather-stories']) {
    assert.equal(supportsAdvertising(path), true, path);
    assert.equal(supportsAdvertising(`${path}/`), true, `${path}/`);
  }
  for (const story of weatherStories) assert.equal(supportsAdvertising(`/weather-stories/${story.slug}`), true);
});
test('private, paid, RSVP, checkout, legal and unknown pages fail closed', () => {
  for (const path of ['/a/secret', '/announcements', '/invitation/token', '/events', '/events/paid', '/events/id/package', '/events/id/invitation', '/rsvp.html', '/create-event', '/privacy', '/terms', '/contact', '/design-preview', '/weather-stories/not-a-story', '/weather-stories-extra', '/api/weather/home', '/missing']) {
    assert.equal(supportsAdvertising(path), false, path);
  }
});
test('manual placements require a real numeric configuration, never a placeholder', () => {
  for (const value of [undefined, '', 'replace-me', '123x', ' 123', '-12']) assert.equal(validAdSlot(value), null);
  assert.equal(validAdSlot('1234567890'), '1234567890');
});
