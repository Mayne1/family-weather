import assert from "node:assert/strict";
import test from "node:test";
import { sendPasswordReset } from "./firebaseAuth.ts";

test("password reset uses Firebase's password-reset action without exposing account existence", async () => {
  const originalFetch = globalThis.fetch;
  const requests: Array<{ url: string; body: Record<string, string> }> = [];
  globalThis.fetch = (async (input, init) => {
    requests.push({ url: String(input), body: JSON.parse(String(init?.body)) });
    return new Response(JSON.stringify({ error: { message: "EMAIL_NOT_FOUND" } }), { status: 400, headers: { "Content-Type": "application/json" } });
  }) as typeof fetch;
  try {
    await sendPasswordReset("missing@example.com");
    assert.match(requests[0].url, /accounts:sendOobCode/);
    assert.deepEqual(requests[0].body, { requestType: "PASSWORD_RESET", email: "missing@example.com" });
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("password reset reports a generic provider failure", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async () => new Response(JSON.stringify({ error: { message: "TOO_MANY_ATTEMPTS_TRY_LATER" } }), { status: 400, headers: { "Content-Type": "application/json" } })) as typeof fetch;
  try {
    await assert.rejects(() => sendPasswordReset("person@example.com"), /could not send the reset email/i);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
