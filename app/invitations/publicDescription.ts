const PRIVATE_PLAN_DETAIL = /^(?:\d+|unspecified)\s+guests?$|^weather fit\b|^best window\b/i;

export function publicEventDescription(description?: string | null) {
  const visibleParts = String(description || "")
    .split("·")
    .map((part) => part.trim())
    .filter((part) => part && !PRIVATE_PLAN_DETAIL.test(part));

  return visibleParts.slice(0, 2).join(" · ");
}
