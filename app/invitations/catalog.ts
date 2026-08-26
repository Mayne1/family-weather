export const invitationDesigns = [
  {
    id: "wedding-editorial",
    category: "Wedding",
    name: "Ivory Garden",
    note: "Elegant ivory, gold, and garden florals",
    artwork: "/invitations/designs/wedding-editorial.webp",
    mark: "W",
  },
  {
    id: "graduation-ascent",
    category: "Graduation",
    name: "The Ascent",
    note: "Midnight blue with a confident gold finish",
    artwork: "/invitations/designs/graduation-ascent.webp",
    mark: "G",
  },
  {
    id: "baby-botanical",
    category: "Baby shower",
    name: "Little Wildflower",
    note: "Soft botanical keepsake with moonlit details",
    artwork: "/invitations/designs/baby-botanical.webp",
    mark: "B",
  },
  {
    id: "birthday-after-dark",
    category: "Birthday",
    name: "After Dark",
    note: "Editorial color for milestone celebrations",
    artwork: "/invitations/designs/birthday-after-dark.webp",
    mark: "25",
  },
  {
    id: "cookout-table",
    category: "Cookout",
    name: "Pull Up a Chair",
    note: "Warm family-table energy for food and fellowship",
    artwork: "/invitations/designs/cookout-table.webp",
    mark: "C",
  },
  {
    id: "park-paper",
    category: "Outdoor event",
    name: "Open Air",
    note: "Fresh layered landscape for park plans",
    artwork: "/invitations/designs/park-paper.webp",
    mark: "P",
  },
] as const;

export type InvitationDesignId = (typeof invitationDesigns)[number]["id"];

export type InvitationRecord = {
  event_id?: string;
  design_id: InvitationDesignId;
  headline?: string | null;
  honoree_names?: string | null;
  message?: string | null;
  special_instructions?: string | null;
  photo_url?: string | null;
};

export function getInvitationDesign(value?: string | null) {
  return invitationDesigns.find((design) => design.id === value) || invitationDesigns[3];
}

export function suggestedInvitationDesign(activity?: string | null): InvitationDesignId {
  const value = String(activity || "").toLowerCase();
  if (value.includes("wedding") || value.includes("engagement")) return "wedding-editorial";
  if (value.includes("graduation")) return "graduation-ascent";
  if (value.includes("baby") || value.includes("shower")) return "baby-botanical";
  if (value.includes("cookout") || value.includes("reunion") || value.includes("family")) return "cookout-table";
  if (value.includes("park") || value.includes("outdoor")) return "park-paper";
  return "birthday-after-dark";
}
