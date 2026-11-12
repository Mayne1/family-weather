'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const express = require('express');
const request = require('supertest');
const { newDb } = require('pg-mem');
const makeRouter = require('./event-entitlements-router');
const secret = 'whsec_unit_test_not_a_credential';
process.env.STRIPE_WEBHOOK_SECRET = secret;

function setup() {
  const db = newDb();
  db.public.none('CREATE TABLE events(id BIGINT PRIMARY KEY,owner_uid TEXT); CREATE TABLE invites(token TEXT PRIMARY KEY,event_id TEXT,inviter_email TEXT,invited_email TEXT,expires_at TIMESTAMPTZ);');
  db.public.none(fs.readFileSync(__dirname + '/event-entitlements.sql', 'utf8').split('CREATE TABLE IF NOT EXISTS family_weather_migrations')[0]);
  db.public.none(fs.readFileSync(__dirname + '/family-access.sql', 'utf8'));
  const { Pool } = db.adapters.createPg();
  const pool = new Pool();
  const app = express();
  app.use(express.json());
  app.use(makeRouter(pool, (req, res, next) => {
    req.uid = req.headers.authorization;
    return req.uid ? next() : res.status(401).json({ ok: false });
  }));
  return { pool, app };
}
function session(changes = {}) {
  return { id: 'cs_live_UnitCheckout', livemode: true, mode: 'payment', status: 'complete', payment_status: 'paid', currency: 'usd', amount_total: 199, client_reference_id: '1', metadata: { event_id: '1', product_code: 'clean_event_199' }, payment_intent: 'pi_UnitPayment', customer: null, ...changes };
}
function event(type = 'checkout.session.completed', changes = {}) {
  return { id: 'evt_UnitEvent', livemode: true, type, data: { object: session() }, ...changes };
}
function deliver(app, value, options = {}) {
  const payload = options.payload || JSON.stringify(value);
  const timestamp = options.timestamp || Math.floor(Date.now() / 1000);
  const signature = options.signature || `t=${timestamp},v1=${crypto.createHmac('sha256', secret).update(`${timestamp}.${payload}`).digest('hex')}`;
  return request(app).post('/billing/stripe-webhook').send({ payload, signature });
}
async function seed(pool, changes = {}) {
  await pool.query("INSERT INTO events VALUES(1,'owner')");
  const row = { status: 'free', product: 'free_event', amount: 0, pending: 'clean_event_199', due: 199, ...changes };
  await pool.query(`INSERT INTO event_entitlements(event_id,status,product_code,amount_cents,pending_product_code,pending_amount_cents,stripe_checkout_session_id,stripe_checkout_url,email_consumed) VALUES(1,$1,$2,$3,$4,$5,'cs_live_UnitCheckout','https://checkout.stripe.com/unit',2)`, [row.status, row.product, row.amount, row.pending, row.due]);
}
async function row(pool) { return (await pool.query('SELECT * FROM event_entitlements WHERE event_id=1')).rows[0]; }
async function purchaseCount(pool) { return Number((await pool.query("SELECT count(*) AS n FROM commerce_events WHERE event_name='purchase_completed'")).rows[0].n); }

test('signed live immediate payment grants once and rejects cancellation after fulfillment', async () => {
  const { app, pool } = setup();
  try {
    await seed(pool);
    assert.equal((await deliver(app, event())).status, 200);
    const paid = await row(pool);
    assert.equal(paid.status, 'paid'); assert.equal(paid.product_code, 'clean_event_199');
    assert.equal(paid.amount_cents, 199); assert.equal(paid.email_consumed, 2);
    assert.equal(paid.pending_product_code, null); assert.equal(paid.stripe_checkout_url, null);
    assert.equal((await deliver(app, event())).body.duplicate, true);
    assert.equal(await purchaseCount(pool), 1);
    assert.equal((await request(app).delete('/events/1/entitlement/checkout').set('Authorization', 'owner').send({ stripe_checkout_session_id: 'cs_live_UnitCheckout' })).status, 404);
    assert.equal((await row(pool)).stripe_checkout_session_id, 'cs_live_UnitCheckout');
  } finally { await pool.end(); }
});

test('test mode, invalid signatures, expired signatures and malformed JSON cannot grant access', async () => {
  const { app, pool } = setup();
  try {
    await seed(pool);
    const invalid = [
      [event(), { signature: 't=1,v1=wrong' }],
      [event(), { timestamp: Math.floor(Date.now() / 1000) - 301 }],
      [event(), { payload: 'not json' }],
      [event('checkout.session.completed', { livemode: false })],
      [event('checkout.session.completed', { data: { object: session({ livemode: false }) } })],
      [event('checkout.session.completed', { data: { object: session({ id: 'cs_test_NotLive' }) } })],
    ];
    for (const [value, options] of invalid) assert.equal((await deliver(app, value, options)).status, 400);
    assert.equal((await row(pool)).status, 'free'); assert.equal(await purchaseCount(pool), 0);
  } finally { await pool.end(); }
});

test('exact amount, currency, event metadata, session status and payment status are required', async () => {
  const { app, pool } = setup();
  try {
    await seed(pool);
    for (const changes of [{ amount_total: 1 }, { amount_total: 199.1 }, { currency: 'eur' }, { client_reference_id: '2' }, { mode: 'subscription' }, { status: 'open' }, { payment_status: 'no_payment_required' }, { metadata: { event_id: '1', product_code: 'event_plus_599' } }]) {
      assert.equal((await deliver(app, event('checkout.session.completed', { data: { object: session(changes) } }))).status, 400);
    }
    assert.equal((await row(pool)).status, 'free'); assert.equal(await purchaseCount(pool), 0);
  } finally { await pool.end(); }
});

test('delayed completion waits; async success fulfills once regardless of later unpaid completion', async () => {
  const { app, pool } = setup();
  try {
    await seed(pool);
    const unpaid = event('checkout.session.completed', { data: { object: session({ payment_status: 'unpaid' }) } });
    assert.equal((await deliver(app, unpaid)).body.payment_processing, true);
    assert.equal((await row(pool)).status, 'free'); assert.equal(await purchaseCount(pool), 0);
    assert.equal((await deliver(app, event('checkout.session.async_payment_succeeded'))).status, 200);
    assert.equal((await deliver(app, unpaid)).body.duplicate, true);
    assert.equal((await deliver(app, event('checkout.session.async_payment_succeeded'))).body.duplicate, true);
    assert.equal((await row(pool)).status, 'paid'); assert.equal(await purchaseCount(pool), 1);
  } finally { await pool.end(); }
});

test('async failure clears only the attempt and preserves previously paid benefits and counters', async () => {
  const { app, pool } = setup();
  try {
    await seed(pool, { status: 'paid', product: 'clean_event_199', amount: 199, pending: 'event_plus_599', due: 400 });
    await pool.query("UPDATE event_entitlements SET stripe_payment_intent_id='pi_OldPaid',purchased_at=now() WHERE event_id=1");
    const before = await row(pool);
    const failure = event('checkout.session.async_payment_failed', { data: { object: session({ payment_status: 'unpaid', amount_total: 400, metadata: { event_id: '1', product_code: 'event_plus_599' } }) } });
    assert.equal((await deliver(app, failure)).body.payment_failed, true);
    const after = await row(pool);
    for (const key of ['status', 'product_code', 'amount_cents', 'email_limit', 'email_consumed', 'stripe_payment_intent_id']) assert.equal(after[key], before[key]);
    assert.equal(after.pending_product_code, null); assert.equal(after.stripe_checkout_url, null);
    assert.equal(after.stripe_checkout_session_id, 'cs_live_UnitCheckout');
    assert.equal((await deliver(app, failure)).body.ignored, true);
    assert.equal(await purchaseCount(pool), 0);
  } finally { await pool.end(); }
});

test('failure arriving after success cannot revoke paid access', async () => {
  const { app, pool } = setup();
  try {
    await seed(pool);
    await deliver(app, event('checkout.session.async_payment_succeeded'));
    const failure = event('checkout.session.async_payment_failed', { data: { object: session({ payment_status: 'unpaid' }) } });
    assert.equal((await deliver(app, failure)).body.duplicate, true);
    assert.equal((await row(pool)).status, 'paid'); assert.equal(await purchaseCount(pool), 1);
  } finally { await pool.end(); }
});

test('unregistered paid events remain retryable; obsolete failures are harmless', async () => {
  const { app, pool } = setup();
  try {
    await seed(pool);
    const other = session({ id: 'cs_live_NotRegistered' });
    assert.equal((await deliver(app, event('checkout.session.async_payment_succeeded', { data: { object: other } }))).status, 409);
    assert.equal((await deliver(app, event('checkout.session.async_payment_failed', { data: { object: { ...other, payment_status: 'unpaid' } } }))).body.ignored, true);
    assert.equal((await row(pool)).pending_product_code, 'clean_event_199'); assert.equal(await purchaseCount(pool), 0);
  } finally { await pool.end(); }
});

test('pending session registration is idempotent and cannot be replaced by a racing checkout', async () => {
  const { app, pool } = setup();
  try {
    await seed(pool);
    const post = (id) => request(app).post('/events/1/entitlement/checkout').set('Authorization', 'owner').send({ product_code: 'clean_event_199', stripe_checkout_session_id: id, stripe_checkout_url: 'https://checkout.stripe.com/unit' });
    assert.equal((await post('cs_test_NotLive')).status, 400);
    assert.equal((await post('cs_live_UnitCheckout')).status, 200);
    assert.equal((await post('cs_live_RacingCheckout')).status, 409);
    assert.equal((await row(pool)).stripe_checkout_session_id, 'cs_live_UnitCheckout');
    assert.equal((await pool.query('SELECT * FROM commerce_events')).rowCount, 0);
  } finally { await pool.end(); }
});

test('unpaid async success and paid async failure are rejected without granting access', async () => {
  const { app, pool } = setup();
  try {
    await seed(pool);
    assert.equal((await deliver(app, event('checkout.session.async_payment_succeeded', { data: { object: session({ payment_status: 'unpaid' }) } }))).status, 400);
    assert.equal((await deliver(app, event('checkout.session.async_payment_failed'))).status, 400);
    assert.equal((await row(pool)).status, 'free'); assert.equal(await purchaseCount(pool), 0);
  } finally { await pool.end(); }
});


test('a promotion cannot orphan a pending payment or consume the promotion code', async () => {
  const { app, pool } = setup();
  try {
    await seed(pool);
    const code = 'FW-UNITCODE';
    const hash = makeRouter._test.hashPromotionCode(code);
    await pool.query("INSERT INTO promotion_codes(code_hash,product_code,created_by_uid) VALUES($1,'clean_event_199','admin')", [hash]);
    assert.equal((await request(app).post('/events/1/entitlement/promo').set('Authorization', 'owner').send({ code })).status, 409);
    assert.equal((await row(pool)).stripe_checkout_session_id, 'cs_live_UnitCheckout');
    assert.equal((await row(pool)).pending_amount_cents, 199);
    assert.equal((await pool.query('SELECT redeemed_at FROM promotion_codes WHERE code_hash=$1', [hash])).rows[0].redeemed_at, null);
    assert.equal((await deliver(app, event())).status, 200);
    assert.equal((await row(pool)).status, 'paid'); assert.equal(await purchaseCount(pool), 1);
  } finally { await pool.end(); }
});

test('pending cancellation remains owner-scoped and preserves free event access', async () => {
  const { app, pool } = setup();
  try {
    await seed(pool);
    const cancel = (owner) => request(app).delete('/events/1/entitlement/checkout').set('Authorization', owner).send({ stripe_checkout_session_id: 'cs_live_UnitCheckout' });
    assert.equal((await cancel('stranger')).status, 404);
    assert.equal((await row(pool)).pending_product_code, 'clean_event_199');
    assert.equal((await cancel('owner')).status, 200);
    const after = await row(pool);
    assert.equal(after.status, 'free'); assert.equal(after.email_consumed, 2);
    assert.equal(after.pending_product_code, null); assert.equal(after.stripe_checkout_session_id, null);
  } finally { await pool.end(); }
});
