"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const read = (...parts) => fs.readFileSync(path.join(__dirname, "..", ...parts), "utf8");

test("planning is consolidated into substantial public tools without generated detail routes", () => {
  assert.match(read("app", "layout.tsx"), /Free Event Weather Planner & Digital Invitations/);
  assert.match(read("app", "plan", "page.tsx"), /Activity Weather Planner/);
  assert.match(read("app", "weather-history", "page.tsx"), /Five-Year Weather History Lookup/);
  assert.match(read("app", "event-weather-planning", "page.tsx"), /permanentRedirect\("\/plan"\)/);
  assert.match(read("app", "weather-planning", "page.tsx"), /permanentRedirect\("\/plan"\)/);
  assert.equal(fs.existsSync(path.join(__dirname, "..", "app", "event-weather-planning", "[slug]", "page.tsx")), false);
  assert.equal(fs.existsSync(path.join(__dirname, "..", "app", "weather-planning", "[slug]", "page.tsx")), false);

  const sitemap = read("app", "sitemap.ts");
  assert.doesNotMatch(sitemap, /eventWeatherPlanningPages/);
  assert.doesNotMatch(sitemap, /weatherPlanningDestinations/);
});

test("the homepage links visitors to the real public tools and company pages", () => {
  const home = read("app", "page.tsx");
  assert.match(home, /href="\/weather-stories"/);
  assert.match(home, /href="\/plan"/);
  assert.match(home, /href="\/today"/);
  assert.match(home, /href="\/weather-history"/);
  assert.match(home, /href="\/how-it-works"/);
  assert.match(home, /href="\/about"/);
  assert.match(home, /href="\/contact"/);
  assert.match(home, /href="\/pricing"/);
});

test("weather stories publish five editorial discovery pages and include them in the sitemap", () => {
  const stories = read("app", "weather-stories", "stories.ts");
  const sitemap = read("app", "sitemap.ts");
  const storyCount = (stories.match(/published: "2026-09-12"/g) || []).length;
  assert.equal(storyCount, 5);
  assert.match(sitemap, /weatherStories/);
  assert.match(read("app", "weather-stories", "[slug]", "page.tsx"), /"@type": "Article"/);
});

test("legal and consent pages stay accessible but out of the search index", () => {
  const sitemap = read("app", "sitemap.ts");
  for (const route of ["privacy", "terms", "sms-consent"]) {
    assert.doesNotMatch(sitemap, new RegExp(`origin}/\\${route}`));
    assert.match(read("app", route, "page.tsx"), /robots: \{ index: false, follow: true \}/);
  }
});

test("the production retirement script keeps obsolete account pages gone", () => {
  const retirement = read("deploy", "retire-legacy-site.sh");
  assert.match(retirement, /auth\.html \{ return 410; \}/);
  assert.match(retirement, /profile\|settings\|my-events/);
});
