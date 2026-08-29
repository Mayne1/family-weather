"use strict";

const express = require("express");

const text = (value, limit) => String(value == null ? "" : value).trim().slice(0, limit);
const number = (value) => Number(value);

module.exports = function makeEventLocationsRouter(pool, requireFirebaseUser) {
  const router = express.Router();

  router.get("/events/:id/location", requireFirebaseUser, async (req, res) => {
    try {
      const result = await pool.query(
        `SELECT event_id, input_text, normalized_label, latitude, longitude,
                country_code, country, admin1, locality, postal_code,
                place_type, provider, provider_place_id, created_at, updated_at
         FROM event_locations
         WHERE event_id = $1
           AND EXISTS (SELECT 1 FROM events WHERE id = $1 AND owner_uid = $2)`,
        [text(req.params.id, 40), req.uid]
      );
      return res.json({ ok: true, location: result.rows[0] || null });
    } catch (error) {
      console.error("event_location_fetch_failed", error);
      return res.status(500).json({ ok: false, error: "event_location_fetch_failed" });
    }
  });

  router.put("/events/:id/location", requireFirebaseUser, async (req, res) => {
    const eventId = text(req.params.id, 40);
    const latitude = number(req.body?.lat ?? req.body?.latitude);
    const longitude = number(req.body?.lon ?? req.body?.longitude);
    const normalizedLabel = text(req.body?.label ?? req.body?.normalized_label, 500);
    if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90 || !Number.isFinite(longitude) || longitude < -180 || longitude > 180 || !normalizedLabel) {
      return res.status(400).json({ ok: false, error: "invalid_event_location" });
    }

    try {
      const owner = await pool.query(
        `SELECT id FROM events WHERE id = $1 AND owner_uid = $2 LIMIT 1`,
        [eventId, req.uid]
      );
      if (!owner.rowCount) return res.status(404).json({ ok: false, error: "event_not_found_or_not_owner" });

      const values = [
        eventId,
        text(req.body?.input || normalizedLabel, 500),
        normalizedLabel,
        latitude,
        longitude,
        text(req.body?.countryCode ?? req.body?.country_code, 2).toUpperCase() || null,
        text(req.body?.country, 160) || null,
        text(req.body?.admin1, 160) || null,
        text(req.body?.locality, 160) || null,
        text(req.body?.postalCode ?? req.body?.postal_code, 40) || null,
        text(req.body?.type ?? req.body?.place_type, 80) || null,
        text(req.body?.provider || "unknown", 80),
        text(req.body?.id ?? req.body?.provider_place_id, 200) || null,
      ];
      const result = await pool.query(
        `INSERT INTO event_locations
           (event_id, input_text, normalized_label, latitude, longitude, country_code,
            country, admin1, locality, postal_code, place_type, provider, provider_place_id)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
         ON CONFLICT (event_id) DO UPDATE SET
           input_text = EXCLUDED.input_text,
           normalized_label = EXCLUDED.normalized_label,
           latitude = EXCLUDED.latitude,
           longitude = EXCLUDED.longitude,
           country_code = EXCLUDED.country_code,
           country = EXCLUDED.country,
           admin1 = EXCLUDED.admin1,
           locality = EXCLUDED.locality,
           postal_code = EXCLUDED.postal_code,
           place_type = EXCLUDED.place_type,
           provider = EXCLUDED.provider,
           provider_place_id = EXCLUDED.provider_place_id,
           updated_at = now()
         RETURNING event_id, input_text, normalized_label, latitude, longitude,
                   country_code, country, admin1, locality, postal_code,
                   place_type, provider, provider_place_id, created_at, updated_at`,
        values
      );
      return res.json({ ok: true, location: result.rows[0] });
    } catch (error) {
      console.error("event_location_save_failed", error);
      return res.status(500).json({ ok: false, error: "event_location_save_failed" });
    }
  });

  return router;
};
