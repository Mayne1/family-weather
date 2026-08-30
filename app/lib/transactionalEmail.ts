import "server-only";

const BREVO_TRANSACTIONAL_EMAIL_URL = "https://api.brevo.com/v3/smtp/email";
const SENDER = {
  name: "Family Weather",
  email: "invitations@thefamilyweather.com",
};

type TransactionalInvitation = {
  recipientEmail: string;
  eventTitle: string;
  startsAt?: string | null;
  location?: string | null;
  headline?: string | null;
  message?: string | null;
  invitationUrl: string;
};

export type EmailDeliveryResult =
  | { status: "sent" }
  | { status: "failed"; error: string };

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatEventDate(startsAt?: string | null) {
  if (!startsAt) return "Date and time to be announced";
  const value = new Date(startsAt);
  if (Number.isNaN(value.getTime())) return "Date and time to be announced";
  return value.toLocaleString("en-US", { dateStyle: "full", timeStyle: "short" });
}

export async function sendTransactionalInvitationEmail(
  invitation: TransactionalInvitation,
): Promise<EmailDeliveryResult> {
  const apiKey = process.env.BREVO_API_KEY?.trim();
  if (!apiKey) {
    return { status: "failed", error: "Invitation email delivery is not configured." };
  }

  const eventTitle = invitation.eventTitle.trim() || "Family event";
  const headline = invitation.headline?.trim() || "You’re invited";
  const when = formatEventDate(invitation.startsAt);
  const location = invitation.location?.trim() || "Location to be announced";
  const message = invitation.message?.trim() || "";
  const invitationUrl = invitation.invitationUrl;

  const safeHeadline = escapeHtml(headline);
  const safeEventTitle = escapeHtml(eventTitle);
  const safeWhen = escapeHtml(when);
  const safeLocation = escapeHtml(location);
  const safeMessage = escapeHtml(message);
  const safeInvitationUrl = escapeHtml(invitationUrl);

  const htmlContent = `<!doctype html>
<html lang="en">
  <body style="margin:0;background:#f3f0e8;font-family:Arial,sans-serif;color:#132d35;">
    <div style="max-width:600px;margin:0 auto;padding:32px 18px;">
      <div style="background:#ffffff;border-radius:18px;padding:34px 28px;border:1px solid #ded9cd;">
        <p style="margin:0 0 12px;color:#9a6b16;font-size:13px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;">Family Weather</p>
        <h1 style="margin:0 0 20px;font-size:32px;line-height:1.15;color:#132d35;">${safeHeadline}</h1>
        ${safeMessage ? `<p style="margin:0 0 24px;font-size:17px;line-height:1.6;color:#435b62;">${safeMessage}</p>` : ""}
        <div style="margin:0 0 26px;padding:20px;background:#f7f5ef;border-radius:12px;line-height:1.55;">
          <p style="margin:0 0 10px;"><strong>Event:</strong> ${safeEventTitle}</p>
          <p style="margin:0 0 10px;"><strong>When:</strong> ${safeWhen}</p>
          <p style="margin:0;"><strong>Where:</strong> ${safeLocation}</p>
        </div>
        <p style="margin:0 0 24px;">
          <a href="${safeInvitationUrl}" style="display:inline-block;background:#efb638;color:#172f37;text-decoration:none;font-size:16px;font-weight:700;padding:14px 22px;border-radius:10px;">Open invitation</a>
        </p>
        <p style="margin:0;color:#687b80;font-size:13px;line-height:1.5;">If the button does not work, open this link:<br><a href="${safeInvitationUrl}" style="color:#245f70;word-break:break-all;">${safeInvitationUrl}</a></p>
      </div>
    </div>
  </body>
</html>`;

  try {
    const response = await fetch(BREVO_TRANSACTIONAL_EMAIL_URL, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "api-key": apiKey,
      },
      body: JSON.stringify({
        sender: SENDER,
        to: [{ email: invitation.recipientEmail }],
        subject: `${eventTitle} — You’re invited`,
        htmlContent,
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });

    if (!response.ok) {
      return { status: "failed", error: "Invitation email could not be delivered." };
    }
    return { status: "sent" };
  } catch {
    return { status: "failed", error: "Invitation email could not be delivered." };
  }
}
