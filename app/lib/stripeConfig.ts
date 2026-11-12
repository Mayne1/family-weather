// Used only by server routes. Keys stay in the server environment, never public config.
export const STRIPE_API_VERSION = "2026-09-30.endive";

export function isLiveStripeSecret(value: string | undefined): value is string {
  return typeof value === "string" && /^(?:rk|sk)_live_[A-Za-z0-9]+$/.test(value);
}

export function stripeHeaders(secret: string): Record<string, string> {
  return { Authorization: `Bearer ${secret}`, "Stripe-Version": STRIPE_API_VERSION };
}
