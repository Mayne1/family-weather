export function sharePayload(kind: "invitation" | "announcement", title: string, url: string) {
  return {
    title,
    // Keep the instruction and URL together. iMessage otherwise renders a detached
    // preview card that can look like a heading instead of the thing to tap.
    text: kind === "invitation"
      ? `${title}\n\nTAP THIS LINK TO OPEN THE INVITATION AND RSVP:\n${url}`
      : `${title}\n\nTAP THIS LINK TO READ THE ANNOUNCEMENT AND REPLY:\n${url}`,
  };
}

type ShareDevice = { share?: (data: { title: string; text: string }) => Promise<void> };

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
