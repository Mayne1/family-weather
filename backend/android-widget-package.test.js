const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

test("the current Android artifact updates the installed widget app", () => {
  const gradle = read("android/app/build.gradle");
  const workflow = read(".github/workflows/mobile-android-debug.yml");

  assert.match(gradle, /applicationId\s+"com\.thefamilyweather\.app"/);
  assert.match(gradle, /applicationIdSuffix\s+"\.widgetpreview"/);
  assert.match(gradle, /versionCode\s+15/);
  assert.match(gradle, /versionName\s+"2\.1\.0"/);

  assert.match(workflow, /assembleWidgetPreview/);
  assert.match(workflow, /com\.thefamilyweather\.app\.widgetpreview/);
  assert.match(workflow, /versionCode='15'/);
  assert.match(workflow, /family-weather-current-widget-android-v15/);
  assert.doesNotMatch(workflow, /com\.thefamilyweather\.app\.nighttest/);
});

test("the current Android package retains both weather and response widgets", () => {
  const manifest = read("android/app/src/main/AndroidManifest.xml");
  const activity = read("android/app/src/main/java/com/thefamilyweather/app/MainActivity.java");

  for (const component of [
    "WeatherWidgetProvider",
    "WeatherWidgetService",
    "WeatherWidgetConfigureActivity",
    "ResponseWidgetProvider",
  ]) {
    assert.match(manifest, new RegExp(component));
  }

  assert.match(activity, /ResponseWidgetsPlugin\.class/);
  for (const resource of [
    "android/app/src/main/res/layout/weather_widget.xml",
    "android/app/src/main/res/layout/response_widget.xml",
    "android/app/src/main/res/xml/weather_widget_info.xml",
    "android/app/src/main/res/xml/response_widget_info.xml",
  ]) {
    assert.ok(fs.existsSync(path.join(root, resource)), `${resource} must remain packaged`);
  }
});

test("the widget app uses the website announcement design catalog", () => {
  const screens = read("mobile/src/screens.tsx");
  assert.match(screens, /announcementDesigns\s*}\s*from\s*"\.\.\/\.\.\/app\/announcements\/designs"/);
  assert.match(screens, /announcementDesigns\.map/);
});
