"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const publisherId = "ca-pub-7197347169057891";
const layout = fs.readFileSync(path.join(__dirname, "..", "app", "layout.tsx"), "utf8");
const adsTxt = fs.readFileSync(path.join(__dirname, "..", "public", "ads.txt"), "utf8");
const nextConfig = fs.readFileSync(path.join(__dirname, "..", "next.config.ts"), "utf8");

test("AdSense loader is installed once in the global document head", () => {
  assert.match(layout, /<head>[\s\S]*pagead2\.googlesyndication\.com\/pagead\/js\/adsbygoogle\.js/);
  assert.match(layout, new RegExp(`client=${publisherId}`));
  assert.match(layout, /async/);
  assert.match(layout, /crossOrigin="anonymous"/);
  assert.equal(layout.match(/pagead2\.googlesyndication\.com\/pagead\/js\/adsbygoogle\.js/g)?.length, 1);
});

test("AdSense loader and ads.txt use the same publisher account", () => {
  assert.match(adsTxt, new RegExp(`google\\.com, ${publisherId.replace("ca-", "")}, DIRECT, f08c47fec0942fa0`));
});

test("the site security policy permits the AdSense loader and its HTTPS resources", () => {
  assert.match(nextConfig, /script-src[^;]*https:/);
  assert.match(nextConfig, /connect-src[^;]*https:/);
  assert.match(nextConfig, /frame-src https:/);
  assert.match(nextConfig, /img-src[^;]*https:/);
});
