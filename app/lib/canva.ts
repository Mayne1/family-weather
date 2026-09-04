import "server-only";

import { createCipheriv, createDecipheriv, createHash, createPublicKey, randomBytes, verify } from "node:crypto";

const CANVA_API = "https://api.canva.com/rest/v1";
const CANVA_AUTHORIZE = "https://www.canva.com/api/oauth/authorize";
const CANVA_TOKEN = `${CANVA_API}/oauth/token`;
const CANVA_KEYS = `${CANVA_API}/connect/keys`;
const MAX_ARTWORK_BYTES = 8 * 1024 * 1024;

export type CanvaTokenPayload = {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  jobKey: string;
};

type CanvaJobPayload = { codeVerifier: string; jobKey: string } | CanvaTokenPayload;

type CanvaJob = {
  event_id: string | number;
  event_title: string;
  encrypted_payload: string;
  design_id?: string | null;
  status: string;
  expires_at: string;
};

function config() {
  const clientId = process.env.CANVA_CLIENT_ID?.trim();
  const clientSecret = process.env.CANVA_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) throw new Error("canva_not_configured");
  return { clientId, clientSecret };
}

function base64Url(value: Buffer) {
  return value.toString("base64url");
}

export function canvaStateHash(state: string) {
  return createHash("sha256").update(state).digest("hex");
}

export function newCanvaAuthorization(callbackUrl: string) {
  const { clientId } = config();
  const state = base64Url(randomBytes(32));
  const jobKey = base64Url(randomBytes(32));
  const codeVerifier = base64Url(randomBytes(64));
  const codeChallenge = base64Url(createHash("sha256").update(codeVerifier).digest());
  const url = new URL(CANVA_AUTHORIZE);
  url.searchParams.set("code_challenge", codeChallenge);
  url.searchParams.set("code_challenge_method", "S256");
  url.searchParams.set("scope", "design:content:read design:content:write design:meta:read");
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", callbackUrl);
  url.searchParams.set("state", state);
  return { state, jobKey, codeVerifier, authorizationUrl: url.toString() };
}

function encryptionKey() {
  return createHash("sha256").update(`family-weather-canva-token-v1\0${config().clientSecret}`).digest();
}

export function encryptCanvaPayload(payload: CanvaJobPayload) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(JSON.stringify(payload), "utf8"), cipher.final()]);
  return [base64Url(iv), base64Url(cipher.getAuthTag()), base64Url(ciphertext)].join(".");
}

export function decryptCanvaPayload<T extends CanvaJobPayload>(value: string): T {
  const [ivText, tagText, ciphertextText] = value.split(".");
  if (!ivText || !tagText || !ciphertextText) throw new Error("invalid_canva_payload");
  const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), Buffer.from(ivText, "base64url"));
  decipher.setAuthTag(Buffer.from(tagText, "base64url"));
  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(ciphertextText, "base64url")),
    decipher.final(),
  ]).toString("utf8");
  return JSON.parse(plaintext) as T;
}

async function canvaJson(url: string, init: RequestInit) {
  const response = await fetch(url, { ...init, cache: "no-store" });
  const data = await response.json().catch(() => null);
  if (!response.ok || !data) throw new Error("canva_request_failed");
  return data;
}

async function tokenRequest(parameters: URLSearchParams, jobKey: string) {
  const { clientId, clientSecret } = config();
  const data = await canvaJson(CANVA_TOKEN, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`, "utf8").toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: parameters,
  });
  if (!data.access_token || !data.refresh_token) throw new Error("canva_token_failed");
  return {
    accessToken: String(data.access_token),
    refreshToken: String(data.refresh_token),
    expiresAt: Date.now() + Number(data.expires_in || 14_400) * 1000,
    jobKey,
  } satisfies CanvaTokenPayload;
}

export function exchangeCanvaCode(code: string, codeVerifier: string, callbackUrl: string, jobKey: string) {
  return tokenRequest(new URLSearchParams({
    grant_type: "authorization_code",
    code,
    code_verifier: codeVerifier,
    redirect_uri: callbackUrl,
  }), jobKey);
}

async function validAccessToken(payload: CanvaTokenPayload) {
  if (payload.expiresAt > Date.now() + 60_000) return payload;
  return tokenRequest(new URLSearchParams({ grant_type: "refresh_token", refresh_token: payload.refreshToken }), payload.jobKey);
}

export async function createCanvaDesign(accessToken: string, title: string) {
  const data = await canvaJson(`${CANVA_API}/designs`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      type: "type_and_asset",
      design_type: { type: "custom", width: 1200, height: 1500 },
      title: `${title.slice(0, 150)} – Family Weather invitation`,
    }),
  });
  const designId = String(data?.design?.id || "");
  const editUrl = String(data?.design?.urls?.edit_url || "");
  if (!designId || !editUrl) throw new Error("canva_design_failed");
  return { designId, editUrl };
}

async function wait(milliseconds: number) {
  await new Promise((resolve) => setTimeout(resolve, milliseconds));
}

export async function exportCanvaPng(payload: CanvaTokenPayload, designId: string) {
  const current = await validAccessToken(payload);
  const created = await canvaJson(`${CANVA_API}/exports`, {
    method: "POST",
    headers: { Authorization: `Bearer ${current.accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ design_id: designId, format: { type: "png", pages: [1], lossless: true } }),
  });
  const exportId = String(created?.job?.id || "");
  if (!exportId) throw new Error("canva_export_failed");
  let job = created.job;
  for (let attempt = 0; attempt < 20 && job?.status === "in_progress"; attempt += 1) {
    await wait(750);
    const status = await canvaJson(`${CANVA_API}/exports/${encodeURIComponent(exportId)}`, {
      headers: { Authorization: `Bearer ${current.accessToken}` },
    });
    job = status.job;
  }
  const downloadUrl = job?.status === "success" ? String(job?.urls?.[0] || "") : "";
  if (!downloadUrl) throw new Error("canva_export_failed");
  const response = await fetch(downloadUrl, { cache: "no-store", redirect: "follow" });
  if (!response.ok) throw new Error("canva_download_failed");
  const artwork = Buffer.from(await response.arrayBuffer());
  if (!artwork.length || artwork.length > MAX_ARTWORK_BYTES) throw new Error("canva_artwork_size");
  if (!artwork.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    throw new Error("canva_artwork_type");
  }
  return { artwork, tokenPayload: current };
}

function decodeJsonPart(value: string) {
  return JSON.parse(Buffer.from(value, "base64url").toString("utf8"));
}

export async function verifyCanvaReturn(token: string) {
  const parts = token.split(".");
  if (parts.length !== 3) throw new Error("invalid_canva_return");
  const header = decodeJsonPart(parts[0]);
  const claims = decodeJsonPart(parts[1]);
  if (!header.kid) throw new Error("invalid_canva_return");
  const keys = await canvaJson(CANVA_KEYS, { headers: { Accept: "application/json" } });
  const jwk = (Array.isArray(keys?.keys) ? keys.keys : []).find((item: { kid?: string }) => item.kid === header.kid);
  if (!jwk) throw new Error("invalid_canva_return");
  const algorithm = header.alg === "EdDSA" && jwk.kty === "OKP" && jwk.crv === "Ed25519"
    ? null
    : header.alg === "RS256" && jwk.kty === "RSA"
      ? "RSA-SHA256"
      : undefined;
  if (algorithm === undefined) throw new Error("invalid_canva_return");
  const validSignature = verify(
    algorithm,
    Buffer.from(`${parts[0]}.${parts[1]}`),
    createPublicKey({ key: jwk, format: "jwk" }),
    Buffer.from(parts[2], "base64url"),
  );
  const { clientId } = config();
  const audience = Array.isArray(claims.aud) ? claims.aud : [claims.aud];
  const now = Math.floor(Date.now() / 1000);
  if (!validSignature || !audience.includes(clientId) || claims.type !== "rti" || !claims.exp || claims.exp <= now || (claims.nbf && claims.nbf > now)) {
    throw new Error("invalid_canva_return");
  }
  const state = String(claims.correlation_state || "");
  const designId = String(claims.design_id || "");
  if (!/^[A-Za-z0-9_-]{40,50}$/.test(state) || !designId) throw new Error("invalid_canva_return");
  return { state, designId };
}

export function isCanvaConfigured() {
  try {
    config();
    return true;
  } catch {
    return false;
  }
}

export type { CanvaJob };
