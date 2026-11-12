'use strict';
/* eslint-disable @typescript-eslint/no-require-imports -- Standalone Node CommonJS operator script. */
// Operator-only helper. Never print credentials, provider responses or database rows.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const API = '/home/mayne/apps/family-weather-api';
const FRONT = '/var/www/family-weather-frontend';
const VERSION = '2026-09-30.endive';
const dotenv = require(path.join(API, 'node_modules/dotenv'));
const mode = process.argv[2];
const backup = process.argv[3];
function fail(message) { throw new Error(message); }
function values(file) { return dotenv.parse(fs.readFileSync(file)); }
function replaceValue(text, name, value) {
  const pattern = new RegExp(`^(?:export\\s+)?${name}\\s*=.*$`, 'gm');
  const without = text.replace(pattern, '').replace(/\n{3,}/g, '\n\n');
  return without.replace(/\s*$/, '') + `\n${name}=${value}\n`;
}
function writePrivate(file, contents, ownerFile) {
  const owner = fs.statSync(ownerFile);
  fs.writeFileSync(file, contents, { mode: 0o600, flag: 'wx' });
  fs.chownSync(file, owner.uid, owner.gid);
}
async function countLiveChanges(since) {
  const config = values(path.join(API, '.env'));
  const { Client } = require(path.join(API, 'node_modules/pg'));
  const client = new Client({ connectionString: config.DATABASE_URL, connectionTimeoutMillis: 5000, statement_timeout: 5000 });
  try {
    await client.connect();
    await client.query('BEGIN READ ONLY');
    const result = since
      ? await client.query("SELECT count(*)::int AS n FROM event_entitlements WHERE stripe_checkout_session_id LIKE 'cs_live_%' AND updated_at >= $1", [since])
      : await client.query('SELECT count(*)::int AS n FROM event_entitlements WHERE pending_product_code IS NOT NULL');
    await client.query('ROLLBACK');
    return result.rows[0].n;
  } finally { await client.end().catch(() => {}); }
}
async function prepare() {
  let input = '';
  for await (const chunk of process.stdin) { input += chunk; if (input.length > 4096) fail('Secret input was too long.'); }
  const [key, webhook] = input.trimEnd().split('\n');
  if (!/^rk_live_[A-Za-z0-9]+$/.test(key || '')) fail('A live restricted Stripe key is required.');
  if (!/^whsec_[A-Za-z0-9]+$/.test(webhook || '')) fail('A valid live endpoint signing secret is required.');
  if (await countLiveChanges() !== 0) fail('A checkout is pending. Stop and review it before changing payment mode.');
  const response = await fetch('https://api.stripe.com/v1/checkout/sessions?limit=1', { headers: { Authorization: `Bearer ${key}`, 'Stripe-Version': VERSION }, redirect: 'error', signal: AbortSignal.timeout(10000) });
  // Checking read access never creates a Checkout Session or payment.
  if (!response.ok) fail('Live Stripe Checkout read validation failed. Check the key/account and permissions.');
  await response.body?.cancel();
  const frontEnv = path.join(FRONT, '.env.production.local');
  const apiEnv = path.join(API, '.env');
  writePrivate(path.join(backup, 'frontend.env.candidate'), replaceValue(fs.readFileSync(frontEnv, 'utf8'), 'STRIPE_SECRET_KEY', key), frontEnv);
  writePrivate(path.join(backup, 'backend.env.candidate'), replaceValue(fs.readFileSync(apiEnv, 'utf8'), 'STRIPE_WEBHOOK_SECRET', webhook), apiEnv);
  fs.writeFileSync(path.join(backup, 'started-at'), new Date().toISOString(), { mode: 0o600, flag: 'wx' });
  console.log('Secret candidates validated and stored privately; no active configuration changed.');
}
async function verify() {
  const key = values(path.join(FRONT, '.env.production.local')).STRIPE_SECRET_KEY || '';
  const webhook = values(path.join(API, '.env')).STRIPE_WEBHOOK_SECRET || '';
  if (!key.startsWith('rk_live_') || !webhook.startsWith('whsec_')) fail('Active secret mode validation failed.');
  const payload = JSON.stringify({ id: 'evt_configuration_probe_' + crypto.randomBytes(8).toString('hex'), livemode: true, type: 'family_weather.configuration_probe', data: { object: {} } });
  const timestamp = Math.floor(Date.now() / 1000);
  const signature = `t=${timestamp},v1=${crypto.createHmac('sha256', webhook).update(`${timestamp}.${payload}`).digest('hex')}`;
  const response = await fetch('http://127.0.0.1:3001/api/stripe/webhook', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Stripe-Signature': signature }, body: payload, redirect: 'error', signal: AbortSignal.timeout(10000) });
  if (response.status !== 200) fail('Signed webhook forwarding verification failed.');
  // This signed unknown event is ignored before any database access or fulfillment.
  console.log('Live configuration and signed webhook forwarding verified; no payment was created.');
}
(async () => {
  if (mode === 'prepare') await prepare();
  else if (mode === 'verify') await verify();
  else if (mode === 'pending-check') {
    if (await countLiveChanges() !== 0) fail('A checkout is pending. Stop and review it before changing payment mode.');
  }
  else if (mode === 'rollback-check') {
    const since = fs.readFileSync(path.join(backup, 'started-at'), 'utf8').trim();
    if (await countLiveChanges(since) !== 0) fail('Live checkout activity exists. Keep the live webhook running and review before rollback.');
  } else fail('Unknown deployment helper operation.');
})().catch(error => {
  // Only our fixed diagnostic strings are shown; never echo SDK/network/SQL errors.
  const safe = ['A live restricted Stripe key is required.', 'A valid live endpoint signing secret is required.', 'Secret input was too long.', 'A checkout is pending. Stop and review it before changing payment mode.', 'Live Stripe Checkout read validation failed. Check the key/account and permissions.', 'Active secret mode validation failed.', 'Signed webhook forwarding verification failed.', 'Live checkout activity exists. Keep the live webhook running and review before rollback.', 'Unknown deployment helper operation.'];
  console.error(safe.includes(error.message) ? error.message : 'Deployment validation failed. No secret values were printed.');
  process.exitCode = 1;
});
