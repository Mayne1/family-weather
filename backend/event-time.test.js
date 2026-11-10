const { test } = require('node:test');
const assert = require('node:assert/strict');
const { zonedLocalToISO, eventTimeOptions } = require('./event-time');
test('destination wall time does not use host timezone', () => {
  for (const host of ['UTC','Pacific/Honolulu','Asia/Tokyo']) {
    process.env.TZ = host;
    assert.equal(zonedLocalToISO('2027-07-04T12:00','America/New_York'),'2027-07-04T16:00:00.000Z');
    assert.equal(zonedLocalToISO('2027-01-04T12:00','America/New_York'),'2027-01-04T17:00:00.000Z');
    assert.equal(zonedLocalToISO('2027-07-04T12:00','Asia/Kathmandu'),'2027-07-04T06:15:00.000Z');
  }
});
test('DST gap and fold are rejected without silent hour shift', () => {
  assert.throws(()=>zonedLocalToISO('2027-03-14T02:30','America/New_York'),/does not exist/);
  assert.throws(()=>zonedLocalToISO('2027-11-07T01:30','America/New_York'),/occurs twice/);
  assert.throws(()=>zonedLocalToISO('2027-10-03T02:15','Australia/Lord_Howe'),/does not exist/);
});
test('invalid calendar dates/zones rejected; legacy formatting remains compatible', () => {
  assert.throws(()=>zonedLocalToISO('2027-02-30T12:00','UTC'),/valid event/);
  assert.throws(()=>zonedLocalToISO('2027-01-01T12:00','invalid'),/time zone/);
  assert.deepEqual(eventTimeOptions(null),{});
  assert.deepEqual(eventTimeOptions('America/New_York'),{timeZone:'America/New_York'});
});
