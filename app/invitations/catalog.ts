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
    id: "wedding-blush-cascade",
    category: "Wedding",
    name: "Blush Cascade",
    note: "Soft roses and airy botanical corners",
    artwork: "/invitations/designs/wedding-blush-cascade.webp",
    mark: "W1",
    aspectRatio: "274 / 643",
  },
  {
    id: "wedding-white-garden",
    category: "Wedding",
    name: "White Garden",
    note: "White florals framed by a fine gold oval",
    artwork: "/invitations/designs/wedding-white-garden.webp",
    mark: "W2",
    aspectRatio: "269 / 643",
  },
  {
    id: "wedding-midnight-crest",
    category: "Wedding",
    name: "Midnight Crest",
    note: "Formal navy-black stationery with gold filigree",
    artwork: "/invitations/designs/wedding-midnight-crest.webp",
    mark: "W3",
    aspectRatio: "286 / 643",
  },
  {
    id: "wedding-candlelit-wood",
    category: "Wedding",
    name: "Candlelit Vows",
    note: "Warm string lights, dark wood, and candle glow",
    artwork: "/invitations/designs/wedding-candlelit-wood.webp",
    mark: "W4",
    aspectRatio: "274 / 643",
  },
  {
    id: "wedding-marble-rose",
    category: "Wedding",
    name: "Rose & Marble",
    note: "Modern marble with blush florals and geometric gold",
    artwork: "/invitations/designs/wedding-marble-rose.webp",
    mark: "W5",
    aspectRatio: "282 / 643",
  },
  {
    id: "wedding-burgundy-bloom",
    category: "Wedding",
    name: "Burgundy Bloom",
    note: "Deep wine florals for an evening celebration",
    artwork: "/invitations/designs/wedding-burgundy-bloom.webp",
    mark: "W6",
    aspectRatio: "274 / 478",
  },
  {
    id: "wedding-torn-paper",
    category: "Wedding",
    name: "Garden Paper",
    note: "Handmade paper texture with white blossoms",
    artwork: "/invitations/designs/wedding-torn-paper.webp",
    mark: "W7",
    aspectRatio: "269 / 478",
  },
  {
    id: "wedding-sunset-vows",
    category: "Wedding",
    name: "Sunset Vows",
    note: "A candlelit tropical shoreline at sunset",
    artwork: "/invitations/designs/wedding-sunset-vows.webp",
    mark: "W8",
    aspectRatio: "286 / 478",
  },
  {
    id: "wedding-ink-marble",
    category: "Wedding",
    name: "Ink & Marble",
    note: "Minimal black ink, white stone, and fine gold",
    artwork: "/invitations/designs/wedding-ink-marble.webp",
    mark: "W9",
    aspectRatio: "274 / 478",
  },
  {
    id: "wedding-deco-noir",
    category: "Wedding",
    name: "Deco Noir",
    note: "Black-and-gold Art Deco ceremony style",
    artwork: "/invitations/designs/wedding-deco-noir.webp",
    mark: "W10",
    aspectRatio: "282 / 478",
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
  has_custom_artwork?: boolean;
  artwork_mime?: string | null;
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
