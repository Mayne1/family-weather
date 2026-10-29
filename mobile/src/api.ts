import { Capacitor, CapacitorHttp } from "@capacitor/core";

export const SITE_URL = "https://thefamilyweather.com";
const FIREBASE_API_KEY = "AIzaSyDCZpxyyGJeoIcutk8o_h-96Syo3h8gsv8";
const SESSION_KEY = "family-weather-native-session-v1";

export type AuthSession = {
  email: string;
  localId: string;
  idToken: string;
  refreshToken: string;
  expiresAt: number;
};

type RequestOptions = { method?: string; headers?: Record<string, string>; data?: unknown };

export async function apiRequest<T = any>(path: string, options: RequestOptions = {}): Promise<T> {
  const method = options.method || "GET";
  if (Capacitor.isNativePlatform()) {
    const response = await CapacitorHttp.request({
      url: `${SITE_URL}${path}`,
      method,
      headers: { "Content-Type": "application/json", ...options.headers },
      data: options.data,
      connectTimeout: 15000,
      readTimeout: 65000,
    });
    const data = response.data;
    if (response.status < 200 || response.status >= 300 || data?.ok === false) {
      throw new Error(data?.error || (typeof data === "string" && data.trim() ? data : "Family Weather could not complete that request."));
    }
    return data as T;
  }
  const response = await fetch(path, {
    method,
    headers: { "Content-Type": "application/json", ...options.headers },
    body: options.data === undefined ? undefined : JSON.stringify(options.data),
    cache: "no-store",
  });
  const data = await response.json();
  if (!response.ok || data?.ok === false) throw new Error(data?.error || "Family Weather could not complete that request.");
  return data as T;
}

function saveSession(reply: any, email?: string): AuthSession {
  const session: AuthSession = {
    email: String(reply.email || email || ""),
    localId: String(reply.localId || reply.user_id || ""),
    idToken: String(reply.idToken || reply.id_token || ""),
    refreshToken: String(reply.refreshToken || reply.refresh_token || ""),
    expiresAt: Date.now() + Number(reply.expiresIn || reply.expires_in || 3600) * 1000,
  };
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  return session;
}

export async function authenticate(mode: "signin" | "signup", email: string, password: string) {
  const endpoint = mode === "signin" ? "signInWithPassword" : "signUp";
  const response = await CapacitorHttp.post({
    url: `https://identitytoolkit.googleapis.com/v1/accounts:${endpoint}?key=${FIREBASE_API_KEY}`,
    headers: { "Content-Type": "application/json" },
    data: { email, password, returnSecureToken: true },
  });
  if (response.status < 200 || response.status >= 300) {
    const code = String(response.data?.error?.message || "AUTHENTICATION_FAILED");
    const messages: Record<string, string> = {
      EMAIL_NOT_FOUND: "We could not find that email address.",
      INVALID_PASSWORD: "That password is not correct.",
      INVALID_LOGIN_CREDENTIALS: "That email or password is not correct.",
      EMAIL_EXISTS: "An account already uses that email address.",
      WEAK_PASSWORD: "Use a password with at least six characters.",
    };
    throw new Error(messages[code] || code.replaceAll("_", " ").toLowerCase());
  }
  return saveSession(response.data, email);
}

export function signOut() { localStorage.removeItem(SESSION_KEY); }

export async function getValidSession(): Promise<AuthSession | null> {
  let session: AuthSession | null = null;
  try { session = JSON.parse(localStorage.getItem(SESSION_KEY) || "null"); } catch { return null; }
  if (!session) return null;
  if (session.expiresAt > Date.now() + 60_000) return session;
  try {
    const response = await CapacitorHttp.post({
      url: `https://securetoken.googleapis.com/v1/token?key=${FIREBASE_API_KEY}`,
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      data: new URLSearchParams({ grant_type: "refresh_token", refresh_token: session.refreshToken }).toString(),
    });
    if (response.status < 200 || response.status >= 300) throw new Error("Session expired");
    return saveSession(response.data, session.email);
  } catch {
    signOut();
    return null;
  }
}

export function authHeaders(session: AuthSession) {
  return { Authorization: `Bearer ${session.idToken}`, "Content-Type": "application/json" };
}
