"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const read = (...parts) => fs.readFileSync(path.join(__dirname, "..", ...parts), "utf8");

test("public discovery pages target free event and destination weather searches", () => {
  assert.match(read("app", "layout.tsx"), /Free Event Weather Planner & Digital Invitations/);
  assert.match(read("app", "event-weather-planning", "page.tsx"), /Free Event Weather Planners/);
  assert.match(read("app", "event-weather-planning", "[slug]", "page.tsx"), /Free \$\{eventPage\.name\}/);
  assert.match(read("app", "weather-planning", "page.tsx"), /Free Destination Weather Planner by Date/);
  assert.match(read("app", "weather-planning", "[slug]", "page.tsx"), /Free \$\{destination\.shortName\} Weather Planner by Date/);
});

test("the homepage links search crawlers to both planning collections", () => {
  const home = read("app", "page.tsx");
  assert.match(home, /href="\/weather-stories"/);
  assert.match(home, /href="\/event-weather-planning"/);
  assert.match(home, /href="\/weather-planning"/);
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
