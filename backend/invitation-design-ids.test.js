"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const backendDesignIds = require("./invitation-design-ids");

test("backend accepts every invitation design offered by the frontend", () => {
  const catalog = fs.readFileSync(path.join(__dirname, "..", "app", "invitations", "catalog.ts"), "utf8");
  const frontendDesignIds = new Set([...catalog.matchAll(/\bid:\s*"([^"]+)"/g)].map((match) => match[1]));
  assert.deepEqual([...backendDesignIds].sort(), [...frontendDesignIds].sort());
});
