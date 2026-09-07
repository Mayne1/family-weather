"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

test("guided invitation choices are validated and persisted as JSON", () => {
  const router = fs.readFileSync(path.join(__dirname, "event-invitations-router.js"), "utf8");
  const migration = fs.readFileSync(path.join(__dirname, "event-invitations.sql"), "utf8");
  assert.match(migration, /style_options JSONB NOT NULL DEFAULT '\{\}'::jsonb/);
  for (const option of ["dramatic", "elegant", "bright", "natural", "classic", "script", "modern", "bold", "dark-glass", "frosted", "spotlight", "open", "gold-leaf", "double-line", "fine-line", "none", "embossed", "glow", "shadow", "clean"]) {
    assert.match(router, new RegExp(`\\b${option.replace("-", "\\-")}\\b`));
  }
  assert.match(router, /style_options = EXCLUDED\.style_options/);
});
