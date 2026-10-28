import type { CapacitorConfig } from "@capacitor/cli";

const developmentServer = process.env.CAPACITOR_SERVER_URL?.trim();

const config: CapacitorConfig = {
  appId: "com.thefamilyweather.app",
  appName: "Family Weather",
  webDir: "mobile-shell",
  ...(developmentServer
    ? {
        server: {
          url: developmentServer,
          cleartext: developmentServer.startsWith("http://"),
          allowNavigation: ["thefamilyweather.com", "*.thefamilyweather.com"],
        },
      }
    : {}),
};

export default config;
