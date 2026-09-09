const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");
for (const ext of [".ts", ".tsx"]) {
  require.extensions[ext] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, "utf8"), {
    compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS, esModuleInterop: true },
  }).outputText, filename);
}
const { invitationDesigns, featuredInvitationDesigns, archivedInvitationDesigns, getInvitationDesign } = require("../app/invitations/catalog.ts");
const Card = require("../app/invitations/SignatureInvitation.tsx").default;
test("20 new designs lead the chooser; every older design remains available", () => {
  for (const activity of ["birthday", "wedding", "movie night", "other"]) {
    const featured = featuredInvitationDesigns(activity);
    assert.equal(featured.length, 20);
    assert.ok(featured.every(d => d.id.startsWith("signature-")));
    assert.equal(new Set([...featured, ...archivedInvitationDesigns(activity)].map(d => d.id)).size, invitationDesigns.length);
  }
  assert.equal(getInvitationDesign("outdoor-movie").id, "outdoor-movie");
  for (const design of featuredInvitationDesigns()) assert.ok(fs.existsSync(path.join(__dirname, "../public", design.artwork)));
});
test("signature details escape host text, preserve personal fields and obey branding", () => {
  const props = { invitation: { design_id: "signature-birthday", headline: "<script>bad()</script>", message: "See you there", special_instructions: "Bring a jacket" }, event: { title: "Test", location: "Example Hall", starts_at: "2027-06-04T19:00:00Z" }, artwork: "/test.webp", title: "Birthday", luxe: false, showBranding: false };
  const html = renderToStaticMarkup(React.createElement(Card, props));
  assert.ok(html.includes("&lt;script&gt;"));
  assert.ok(html.includes("Example Hall") && html.includes("Bring a jacket"));
  assert.ok(!html.includes("Family Weather"));
  assert.ok(!html.includes("digitalInvitationShade"));
});
test("download renderer produces a full-height signature keepsake", async () => {
  const { ImageResponse } = require("next/og");
  const art = fs.readFileSync(path.join(__dirname, "../public/invitations/signature/family-friends.png"));
  const response = new ImageResponse(React.createElement(Card, {
    invitation: { design_id: "signature-family-friends", headline: "Our celebration", message: "Welcome, friends!" },
    event: { title: "Celebration", location: "Example Hall", starts_at: "2027-06-04T19:00:00Z" },
    artwork: "data:image/png;base64," + art.toString("base64"), title: "Family & Friends", luxe: true, showBranding: true, exporting: true,
  }), { width: 600, height: undefined });
  const png = Buffer.from(await response.arrayBuffer());
  if (process.env.SIGNATURE_QA_OUTPUT) fs.writeFileSync(process.env.SIGNATURE_QA_OUTPUT, png);
  assert.equal(png.readUInt32BE(16), 600);
  assert.ok(png.readUInt32BE(20) > 900, "full artwork and personal details must not be cropped: " + png.readUInt32BE(20));
});
