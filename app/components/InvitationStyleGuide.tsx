import type { InvitationStyleOptions } from "../invitations/style";

type Props = {
  value: InvitationStyleOptions;
  onChange: (value: InvitationStyleOptions) => void;
  artworkLocked?: boolean;
};

const groups = [
  { key: "look", number: "1", title: "Choose the mood", options: [["dramatic", "Dramatic", "Deep contrast"], ["elegant", "Elegant", "Refined and warm"], ["bright", "Bright", "Fresh and lively"], ["natural", "Natural", "Earthy and relaxed"]] },
  { key: "font", number: "2", title: "Choose the lettering", options: [["classic", "Classic", "Traditional serif"], ["script", "Script accent", "Formal personality"], ["modern", "Modern", "Clean and crisp"], ["bold", "Bold", "Big event energy"]] },
  { key: "panel", number: "3", title: "Make the words readable", options: [["dark-glass", "Dark glass", "Artwork shows through"], ["frosted", "Frosted", "Soft translucent paper"], ["spotlight", "Spotlight", "Shaded center glow"], ["open", "On the artwork", "No center panel"]] },
  { key: "frame", number: "4", title: "Finish the edges", options: [["gold-leaf", "Gold leaf", "Warm metallic frame"], ["double-line", "Double line", "Formal invitation border"], ["fine-line", "Fine line", "Quiet polished edge"], ["none", "No frame", "Full-bleed artwork"]] },
  { key: "depth", number: "5", title: "Add depth", options: [["embossed", "Embossed", "Raised lettering"], ["glow", "Soft glow", "Evening atmosphere"], ["shadow", "Drop shadow", "Strong separation"], ["clean", "Clean", "Minimal finish"]] },
] as const;

export default function InvitationStyleGuide({ value, onChange, artworkLocked = false }: Props) {
  return <section className="invitationStyleGuide" aria-label="Guided invitation styling">
    <div className="invitationStyleGuideHeading"><small>GUIDED INVITATION STUDIO</small><h3>Make the design feel like yours.</h3><p>Choose one option in each row. The preview updates immediately.</p></div>
    {artworkLocked ? <p>The artwork and its title stay as designed. Lettering choices change your personal event details below.</p> : null}
    {groups.filter((group) => !artworkLocked || group.key === "font").map((group) => <fieldset key={group.key}>
      <legend><b>{group.number}</b>{group.title}</legend>
      <div>{group.options.map(([option, label, note]) => <button key={option} type="button" className={value[group.key] === option ? "active" : ""} aria-pressed={value[group.key] === option} onClick={() => onChange({ ...value, [group.key]: option })}><strong>{label}</strong><small>{note}</small></button>)}</div>
    </fieldset>)}
  </section>;
}
