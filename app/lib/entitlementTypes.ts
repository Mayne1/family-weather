export type DistributionMethod = "email" | "share_link";

export type EventEntitlement = {
  event_id: string;
  status: "pending" | "paid" | "legacy";
  product_code: string;
  amount_cents: number;
  currency: string;
  distribution_method: DistributionMethod | "legacy";
  email_limit: number;
  email_consumed: number;
  email_remaining: number;
  share_rsvp_limit: number;
  share_rsvp_count: number;
  share_rsvp_remaining: number;
  share_invite_token?: string | null;
  share_invitation_url?: string | null;
  checkout_url?: string | null;
  purchased_at?: string | null;
};
