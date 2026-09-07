export const invitationLooks = ["dramatic", "elegant", "bright", "natural"] as const;
export const invitationFonts = ["classic", "script", "modern", "bold"] as const;
export const invitationPanels = ["dark-glass", "frosted", "spotlight", "open"] as const;
export const invitationFrames = ["gold-leaf", "double-line", "fine-line", "none"] as const;
export const invitationDepths = ["embossed", "glow", "shadow", "clean"] as const;

export type InvitationStyleOptions = {
  look: (typeof invitationLooks)[number];
  font: (typeof invitationFonts)[number];
  panel: (typeof invitationPanels)[number];
  frame: (typeof invitationFrames)[number];
  depth: (typeof invitationDepths)[number];
};

export const defaultInvitationStyle: InvitationStyleOptions = {
  look: "elegant",
  font: "classic",
  panel: "frosted",
  frame: "gold-leaf",
  depth: "embossed",
};

export function normalizeInvitationStyle(value?: Partial<InvitationStyleOptions> | null): InvitationStyleOptions {
  return {
    look: invitationLooks.includes(value?.look as InvitationStyleOptions["look"]) ? value!.look! : defaultInvitationStyle.look,
    font: invitationFonts.includes(value?.font as InvitationStyleOptions["font"]) ? value!.font! : defaultInvitationStyle.font,
    panel: invitationPanels.includes(value?.panel as InvitationStyleOptions["panel"]) ? value!.panel! : defaultInvitationStyle.panel,
    frame: invitationFrames.includes(value?.frame as InvitationStyleOptions["frame"]) ? value!.frame! : defaultInvitationStyle.frame,
    depth: invitationDepths.includes(value?.depth as InvitationStyleOptions["depth"]) ? value!.depth! : defaultInvitationStyle.depth,
  };
}

export function recommendedInvitationStyle(designId: string): InvitationStyleOptions {
  if (designId === "birthday-essential-balloon-sky") return { look: "bright", font: "classic", panel: "spotlight", frame: "fine-line", depth: "shadow" };
  if (designId === "birthday-signature-storybook-safari") return { look: "natural", font: "script", panel: "open", frame: "gold-leaf", depth: "shadow" };
  if (designId === "birthday-showpiece-midnight-gold") return { look: "dramatic", font: "modern", panel: "open", frame: "gold-leaf", depth: "glow" };
  return defaultInvitationStyle;
}
