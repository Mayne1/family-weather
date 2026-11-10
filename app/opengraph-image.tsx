import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

export const alt = "Family Weather — event weather planning, digital invitations and RSVPs";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpenGraphImage() {
  const logo = await readFile(join(process.cwd(), "public/brand/family-weather-logo.jpg"));
  const logoSource = `data:image/jpeg;base64,${logo.toString("base64")}`;
  return new ImageResponse(
    <div
      style={{
        alignItems: "center",
        background: "linear-gradient(135deg, #06283a 0%, #095b6f 58%, #f3b634 140%)",
        color: "#ffffff",
        display: "flex",
        fontFamily: "Arial, sans-serif",
        height: "100%",
        justifyContent: "center",
        padding: "72px 84px",
        width: "100%",
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", width: "100%" }}>
        <div style={{ alignItems: "center", display: "flex", fontSize: 30, fontWeight: 700, gap: 18 }}>
          <img src={logoSource} alt="" width={82} height={82} style={{ borderRadius: 18 }} />
          Family Weather
        </div>
        <div style={{ display: "flex", flexDirection: "column", fontSize: 74, fontWeight: 800, letterSpacing: -3, lineHeight: 1.03, marginTop: 68, maxWidth: 960 }}>
          <div style={{ display: "flex" }}>Make the plan.</div>
          <div style={{ color: "#f3b634", display: "flex" }}>Know the weather.</div>
        </div>
        <div style={{ color: "#d8edf0", fontSize: 29, lineHeight: 1.4, marginTop: 34 }}>
          Event weather planning · Digital invitations · RSVP management
        </div>
      </div>
    </div>,
    size,
  );
}
