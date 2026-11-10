'use strict';
function validTimeZone(value) {
  if (typeof value !== 'string' || !value || /^[+-]/.test(value) || value.length > 100) return false;
  try { new Intl.DateTimeFormat('en-US', { timeZone: value }).format(); return true; } catch { return false; }
}
function wallParts(instant, timeZone) {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' }).formatToParts(instant);
  const get = key => parts.find(part => part.type === key).value;
  return `${get('year')}-${get('month')}-${get('day')}T${get('hour')}:${get('minute')}:${get('second')}`;
}
// Resolve a wall-clock value independently of the server/device timezone.
// Reject both nonexistent and repeated times instead of silently choosing an offset.
function zonedLocalToISO(local, timeZone) {
  if (!validTimeZone(timeZone)) throw new Error('Choose a valid destination time zone.');
  if (typeof local !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/.test(local)) throw new Error('Enter a valid event date and time.');
  const normalized = local.length === 16 ? local + ':00' : local;
  const nominal = Date.parse(normalized + 'Z');
  if (!Number.isFinite(nominal) || new Date(nominal).toISOString().slice(0,19) !== normalized) throw new Error('Enter a valid event date and time.');
  const offsets = new Set();
  for (const hours of [-48,-24,-12,0,12,24,48]) {
    const point = nominal + hours * 3600000;
    offsets.add(Date.parse(wallParts(new Date(point), timeZone) + 'Z') - point);
  }
  const matches = [...offsets].map(offset => nominal - offset).filter(point => wallParts(new Date(point), timeZone) === normalized).sort((a,b)=>a-b);
  if (!matches.length) throw new Error('That time does not exist at the destination because clocks move forward. Choose another time.');
  if (matches.length > 1) throw new Error('That time occurs twice at the destination because clocks move back. Choose a time outside the repeated hour.');
  return new Date(matches[0]).toISOString();
}
function eventTimeOptions(timeZone) { return validTimeZone(timeZone) ? { timeZone } : {}; }
module.exports = { validTimeZone, zonedLocalToISO, eventTimeOptions };
