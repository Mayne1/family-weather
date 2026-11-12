import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { isLiveStripeSecret, stripeHeaders, STRIPE_API_VERSION } from "./stripeConfig.ts";

test("only server live keys pass the payment configuration guard", () => {
  for (const value of [undefined, "", "sk_test_Example", "rk_test_Example", "pk_live_Example", "sk_live_", "sk_live_Example\n", "sk_live_Two Words"]) assert.equal(isLiveStripeSecret(value), false);
  for (const value of ["rk_live_Example", "sk_live_Example"]) assert.equal(isLiveStripeSecret(value), true);
  assert.equal(stripeHeaders("rk_live_Example")["Stripe-Version"], STRIPE_API_VERSION);
});

test("all Stripe API routes enforce live keys and pin the request version", () => {
  for (const name of ["checkout", "purchase-receipt"]) {
    const route = readFileSync(new URL(`../api/events/[id]/${name}/route.ts`, import.meta.url), "utf8");
    assert.ok(route.includes("isLiveStripeSecret(secret)"));
    assert.ok(route.includes("stripeHeaders(secret)"));
    assert.doesNotMatch(route, /NEXT_PUBLIC_STRIPE|automatic_tax|payment_method_types/);
  }
  const checkout = readFileSync(new URL("../api/events/[id]/checkout/route.ts", import.meta.url), "utf8");
  assert.ok(checkout.includes('sessionId.startsWith("cs_live_")'));
  assert.ok(checkout.includes("stripeData.livemode !== true"));
  assert.ok(checkout.includes('process.env.STRIPE_CHECKOUT_PAUSED === "1"'));
  assert.ok(checkout.indexOf("older test checkout") < checkout.indexOf("checkout_url: current.checkout_url"));
  const webhook = readFileSync(new URL("../api/stripe/webhook/route.ts", import.meta.url), "utf8");
  assert.ok(webhook.includes("await request.text()"));
  assert.ok(webhook.includes("JSON.stringify({ payload, signature })"));
  assert.doesNotMatch(webhook, /request\.json\(|console\./);
});
