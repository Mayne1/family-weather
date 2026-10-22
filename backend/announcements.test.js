'use strict';
const test=require('node:test');const assert=require('node:assert/strict');const crypto=require('node:crypto');
const {phone,smsContent,paidOrder,validSignature}=require('./announcement-rules');
test('U.S. numbers normalize; international NANP destinations are rejected',()=>{
 assert.equal(phone('(209) 555-0123'),'12095550123');
 assert.throws(()=>phone('+1 416 555 0123'));assert.throws(()=>phone('+1 876 555 0123'));assert.throws(()=>phone('garbage'));
});
test('fixed SMS contains only the public link and fits one ASCII segment',()=>{
 const s=smsContent('a'.repeat(32));assert.ok(s.length<=160);assert.match(s,/STOP/);assert.match(s,/HELP/);assert.match(s,/^[\x20-\x7e]+$/);assert.throws(()=>smsContent('../bad'));
});
test('only the correct paid 99-cent checkout can grant ten credits',()=>{
 const order={id:'order',session_id:'cs_test'};const s={id:'cs_test',metadata:{fw_sms_order:'order'},mode:'payment',payment_status:'paid',currency:'usd',amount_total:99};
 assert.equal(paidOrder(s,order),true);
 for(const change of [{id:'cs_other'},{payment_status:'unpaid'},{amount_total:1},{currency:'eur'},{metadata:{fw_sms_order:'other'}}])assert.equal(paidOrder({...s,...change},order),false);
});
test('webhook signature rejects tampering and expired requests',()=>{
 const payload='{"example":true}',secret='test-only';const sign=t=>`t=${t},v1=${crypto.createHmac('sha256',secret).update(`${t}.${payload}`).digest('hex')}`;
 const t=Math.floor(Date.now()/1000);assert.equal(validSignature(payload,sign(t),secret),true);assert.equal(validSignature(payload+'x',sign(t),secret),false);assert.equal(validSignature(payload,sign(t-600),secret),false);
});
