import "server-only";

const DEFAULT_BACKEND_ORIGIN = "http://127.0.0.1:3000";

export function backendUrl(path = "") {
  const origin = (process.env.FAMILY_WEATHER_API_ORIGIN || DEFAULT_BACKEND_ORIGIN).replace(/\/$/, "");
  return `${origin}${path.startsWith("/") ? path : `/${path}`}`;
}

export function firebaseApiKey() {
  return process.env.FIREBASE_WEB_API_KEY || process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyDCZpxyyGJeoIcutk8o_h-96Syo3h8gsv8";
}

export function publicOrigin(request: Request) {
  const configured = process.env.PUBLIC_ORIGIN?.trim().replace(/\/$/, "");
  if (configured) {
    const url = new URL(configured);
    if (url.protocol !== "https:" || !/^(?:[a-z0-9-]+\.)?thefamilyweather\.com$/i.test(url.hostname)) {
      throw new Error("PUBLIC_ORIGIN must be an HTTPS thefamilyweather.com URL");
    }
    return url.origin;
  }

  const forwardedHost = (request.headers.get("x-forwarded-host") || request.headers.get("host") || "")
    .split(",")[0]
    .trim();
  if (/^(?:[a-z0-9-]+\.)?thefamilyweather\.com(?::\d+)?$/i.test(forwardedHost)) {
    return `https://${forwardedHost}`;
  }
  return "https://thefamilyweather.com";
}
