"use client";

const API_KEY = "AIzaSyDCZpxyyGJeoIcutk8o_h-96Syo3h8gsv8";
const SESSION_KEY = "family-weather-session";

export type AuthSession = {
  email: string;
  localId: string;
  idToken: string;
  refreshToken: string;
  expiresAt: number;
};

type FirebaseReply = {
  email: string;
  localId: string;
  idToken: string;
  refreshToken: string;
  expiresIn: string;
};

function save(reply: FirebaseReply): AuthSession {
  const session = {
    email: reply.email,
    localId: reply.localId,
    idToken: reply.idToken,
    refreshToken: reply.refreshToken,
    expiresAt: Date.now() + Number(reply.expiresIn || 3600) * 1000,
  };
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  return session;
}

async function authenticate(mode: "signInWithPassword" | "signUp", email: string, password: string) {
  const response = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:${mode}?key=${API_KEY}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, returnSecureToken: true }),
  });
  const data = await response.json();
  if (!response.ok) {
    const code = String(data?.error?.message || "AUTHENTICATION_FAILED");
    const messages: Record<string, string> = {
      EMAIL_NOT_FOUND: "We could not find that email address.",
      INVALID_PASSWORD: "That password is not correct.",
      INVALID_LOGIN_CREDENTIALS: "That email or password is not correct.",
      EMAIL_EXISTS: "An account already uses that email address.",
      WEAK_PASSWORD: "Use a password with at least six characters.",
    };
    throw new Error(messages[code] || code.replaceAll("_", " ").toLowerCase());
  }
  return save(data);
}

export function signIn(email: string, password: string) {
  return authenticate("signInWithPassword", email, password);
}

export function signUp(email: string, password: string) {
  return authenticate("signUp", email, password);
}

export function loadSession(): AuthSession | null {
  try {
    const stored = localStorage.getItem(SESSION_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

export function signOut() {
  localStorage.removeItem(SESSION_KEY);
}
