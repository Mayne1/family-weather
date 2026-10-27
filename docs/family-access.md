# Family Access

Private `/family` area, excluded from indexing. Sign in (or create an account), enter the shared family code once, and use existing event, announcement, weather, sharing and RSVP tools. The existing event promotion box accepts the same code and redirects to `/family`.

Membership lives in PostgreSQL against the verified Firebase UID. Codes contain 96 random bits, are stored as SHA-256 hashes, and are never hardcoded. A guest receiving an invitation does not acquire membership. Anyone who is given the private code can enroll; this does not independently verify family relationships.

Family events receive 500 direct emails, unlimited link sharing and the existing unbranded invitation presentation. The plan is separate from the public price list and cannot be purchased. No sale, discount value, or fictional payment is created. Existing larger/legacy benefits, email counters and real payments are preserved. An unfinished checkout must be completed or cancelled before the family benefit replaces that event's plan. New events receive benefits when their entitlement is opened, using the existing event workflow.

The dashboard includes link-sharing instructions, when to use direct email, weather planning guidance, and the Family Weather video playlist. It does not remove ads sitewide; it matches the existing tier's guest-invitation presentation.

## Deploy

Build the frontend, run `bash backend/install-family-access-on-vps.sh`, restart the frontend. The installer backs up the three affected backend modules, runs the additive migration in a transaction, restarts and checks the API service, and restores previous modules if restart fails. It prints an initial family code once if no family code has ever been created. Save it privately. Rerunning preserves existing code settings, including a closed code.

Existing `FAMILY_WEATHER_PROMO_ADMIN_UIDS` administrators can create/replace or close codes in `/family`. Closing or rotating a code prevents further enrollment with that code; enrolled accounts retain membership. Admin authorization is always enforced on the backend. The regular full backend installer also includes the helper and schema.

Validation: integration tests cover authentication, admin authorization, shared and repeat redemption, invalid/closed codes, user isolation, future events, counters, no sales entries, existing promotion entry, and preservation of bigger plans and pending checkout. pg-mem does not simulate production table locking; code rotation uses PostgreSQL's exclusive table lock.
