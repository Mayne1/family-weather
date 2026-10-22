"use strict";
const crypto = require('crypto');
function phone(value) {
 const {parsePhoneNumberFromString}=require('libphonenumber-js/max');
 const parsed=parsePhoneNumberFromString(String(value||''),'US');
 if(!parsed||!parsed.isValid()||parsed.country!=='US')throw new Error('Enter a valid U.S. mobile number.');
 return parsed.number.slice(1);
}
function smsContent(id) {
 if(!/^[a-f0-9]{32}$/.test(id)) throw new Error('Invalid announcement');
 return `Family Weather announcement: https://thefamilyweather.com/a/${id} Reply STOP to stop, HELP for help.`;
}
function validSignature(payload, signature, secret) {
 const parts=String(signature||'').split(',');const t=parts.find(p=>p.startsWith('t='))?.slice(2);
 if(!t||Math.abs(Date.now()/1000-Number(t))>300||!Number.isFinite(Number(t))||!secret)return false;
 const expected=crypto.createHmac('sha256',secret).update(`${t}.${payload}`).digest('hex');
 return parts.filter(p=>p.startsWith('v1=')).some(p=>{const b=Buffer.from(p.slice(3));const a=Buffer.from(expected);return a.length===b.length&&crypto.timingSafeEqual(a,b)});
}
function paidOrder(session, order) {
 return Boolean(order&&session.id===order.session_id&&session.metadata?.fw_sms_order===order.id&&session.mode==='payment'&&session.payment_status==='paid'&&session.currency==='usd'&&session.amount_total===99);
}
const CONSENT_VERSION='2026-10-22';
function disclosure(name){return `I am the owner of this mobile number and agree to receive automated Family Weather announcement links from ${name}. Message frequency varies, with one text per announcement. No marketing texts. Consent is not a condition of purchase. Message and data rates may apply. Reply STOP to stop or HELP for help. Support: contact@thefamilyweather.com.`;}
function secretMatches(value,secret){if(!secret||secret.length<32||typeof value!=='string')return false;const a=Buffer.from(value),b=Buffer.from(secret);return a.length===b.length&&crypto.timingSafeEqual(a,b);}
module.exports={CONSENT_VERSION,disclosure,secretMatches,phone,smsContent,validSignature,paidOrder};
