import {test} from 'node:test';
import assert from 'node:assert/strict';
import {forecastForDate} from './plannerForecast.ts';
const now=new Date('2026-10-24T12:00:00Z');
test('next-year almanac plan never calls a forecast provider, even if provider would time out',async()=>{
 let calls=0;
 const result=await forecastForDate('2027-10-24',async()=>{calls++;throw Error('The operation was aborted due to timeout');},now);
 assert.equal(result,null);assert.equal(calls,0);
});
test('today and near-term dates still use live forecasting',async()=>{
 for(const date of ['2026-10-24','2026-10-30','2026-11-08'])assert.deepEqual(await forecastForDate(date,async()=>({source:'nws'}),now),{source:'nws'});
});
test('past dates also bypass forecasting; timezone edges retain provider lookup',async()=>{
 assert.equal(await forecastForDate('2025-10-24',async()=>{throw Error('must not run');},now),null);
 assert.equal(await forecastForDate('2026-10-23',async()=>true,now),true);
 assert.equal(await forecastForDate('2026-11-10',async()=>true,now),null);
});
test('invalid calendar dates are rejected before a provider request',async()=>{
 for(const date of ['2027-02-29','invalid','2027-13-01'])await assert.rejects(forecastForDate(date,async()=>true,now),/valid calendar date/);
});
