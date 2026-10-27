'use strict';
const crypto = require('crypto');
const FAMILY_PLAN = Object.freeze({code:'family_access', name:'Family Access', priceCents:0, emailLimit:500, rank:5, presentation:'unbranded'});
const hash = value => crypto.createHash('sha256').update(String(value || '').trim().toUpperCase()).digest('hex');
async function membership(db, uid) {
 const result = await db.query('SELECT owner_uid FROM family_members WHERE owner_uid=$1', [uid]);
 return result.rowCount > 0;
}
async function redeemFamily(db, uid, code) {
 if (!/^FW-FAMILY-[A-F0-9]{24}$/.test(String(code || '').trim().toUpperCase())) return false;
 const found = await db.query('SELECT code_hash FROM family_access_codes WHERE code_hash=$1 AND disabled_at IS NULL FOR UPDATE', [hash(code)]);
 if (!found.rowCount) return false;
 await db.query('INSERT INTO family_members(owner_uid,code_hash) VALUES($1,$2) ON CONFLICT(owner_uid) DO NOTHING', [uid,hash(code)]);
 return true;
}
async function applyFamily(db, eventId) {
 const owner = await db.query('SELECT owner_uid FROM events WHERE id=$1',[eventId]);
 if (!owner.rowCount || !await membership(db,owner.rows[0].owner_uid)) return;
 // Never erase a payment or reduce a larger allowance. No sale is recorded.
 await db.query(`UPDATE event_entitlements SET product_code='family_access',email_limit=500,
 distribution_method='both',updated_at=now()
 WHERE event_id=$1 AND status IN ('free','paid') AND email_limit<=500
 AND pending_product_code IS NULL AND stripe_checkout_url IS NULL AND product_code <> 'family_access'`,[eventId]);
}
module.exports={FAMILY_PLAN,hash,membership,redeemFamily,applyFamily};
