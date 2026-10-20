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
 return `Family Weather: You have a personal announcement. Read and reply: https://thefamilyweather.com/a/${id}`;
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
module.exports={phone,smsContent,validSignature,paidOrder};
