# Signature collection — September 2026

20 new design IDs lead the picker; 66 previous IDs remain available in the archive.
No entitlement, pricing, purchase, or database schema changes.
Deploy the backend design-ID allowlist with the frontend to avoid rejected saves.

## Artwork

Family & Friends and Night Out are supplied 1024×1536 illustrations.
The built-in image editor removed example dates, times, locations and embedded
Family Weather logos so event data and entitlement-aware branding can be rendered.
Their design titles and decorative lettering remain raster artwork, not editable text.

The other 18 are deterministic crops from the supplied 1448×1086 contact sheet.
They are approximately 228 pixels wide, suitable as supplied web artwork but not
high-resolution print masters. No invented detail or replacement art was added.
Their existing lettering stays intact; personalized details appear below in a navy/gold section.

WebP assets are served on web pages; PNG copies support the keepsake renderer.
Original uploads were not changed. The same SignatureInvitation component serves
the editor, public card, and keepsake, with explicit export dimensions.
Lettering controls affect personalized text, not lettering baked into the image.

## Image-edit prompts

Family & Friends: preserve supplied artwork, composition and title; remove the
central FRIDAY, SEPTEMBER 11 2026, AT 4:00 PM, location pin and STOCKTON CALIFORNIA;
reconstruct natural dark background; remove bottom Family Weather logo/tagline;
no white panel or redesign.

Night Out: preserve supplied artwork and title; remove central SATURDAY,
SEPTEMBER 19 2026, AT 7:00 PM, location pin, STOCKTON CALIFORNIA, central meet-up
caption and lower divider; restore navy sky; remove STOCKTON building lettering
and bottom Family Weather logo/tagline; no white panel or redesign.

## Verification

Node regression tests cover catalog ordering, archive preservation, backend ID
parity, escaped text, branding, personal fields, and actual PNG keepsake rendering.
Lint and production build are required before release.
Local browser navigation was blocked by the browser environment, so interactive
desktop/mobile browser QA is not claimed. A rendered full-height luxe keepsake was
visually inspected.
