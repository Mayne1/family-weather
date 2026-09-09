"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const backend = path.join(__dirname);

test("invitation joins account for the legacy text event ID column", () => {
  const invites = fs.readFileSync(path.join(backend, "invites_pg.js"), "utf8");
  const rsvpDetails = fs.readFileSync(path.join(backend, "rsvp-details-router.js"), "utf8");
  const invitations = fs.readFileSync(path.join(backend, "event-invitations-router.js"), "utf8");

  assert.match(invites, /e\.event_id::text\s*=\s*i\.event_id/);
  assert.match(rsvpDetails, /e\.event_id::text\s*=\s*i\.event_id/);
  assert.match(rsvpDetails, /i\.event_id\s*=\s*\$1::text/);
  assert.match(rsvpDetails, /s\.event_id\s*=\s*\$1::bigint/);
  assert.match(invitations, /invite\.event_id\s*=\s*invitation\.event_id::text/);
});
