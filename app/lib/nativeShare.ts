export function sharePayload(kind: "invitation" | "announcement", title: string, url: string) {
  return {
    title,
    // Some messaging targets ignore title, so include it in the message too.
    text: kind === "invitation"
      ? `${title}\nYou're invited! Open the invitation and RSVP on Family Weather.`
      : `${title}\nI've shared an announcement with you. Open it and leave me a reply on Family Weather.`,
    url,
  };
}

type ShareDevice = { share?: (data: { title: string; text: string; url: string }) => Promise<void> };

export async function shareLink(device: ShareDevice, data: ReturnType<typeof sharePayload>) {
  if (!device.share) return "unavailable";
  try {
    await device.share(data);
    return "shared";
  } catch (error) {
    return error && typeof error === "object" && "name" in error && error.name === "AbortError"
      ? "cancelled" : "unavailable";
  }
}
