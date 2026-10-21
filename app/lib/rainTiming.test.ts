import test from 'node:test';
import assert from 'node:assert/strict';
import { rainTiming } from './rainTiming.ts';
const hours = [10,11,12,13,14,15].map((h,i) => ({time:`2026-10-21T${h}:00:00-07:00`,temperatureF:70,windMph:5,precipitationProbabilityPct:[11,4,4,5,7,27][i]}));
test('window end is final slot; cleanup begins at 1 PM and covers two hours', () => {
 const r=rainTiming(hours,{start:hours[0].time,end:hours[2].time,label:'10 AM–1 PM',score:100});
 assert.deepEqual(r.cleanup.map(r=>r.label),['1 PM','2 PM']);
 assert.deepEqual(r.peakLabels,['3 PM']); assert.equal(r.peak,27);
 assert.equal(r.rows.filter(r=>r.inWindow).length,3);
});
test('missing probability and unknown local time never become dry hours',()=>{
 const r=rainTiming([{...hours[0],precipitationProbabilityPct:null},{...hours[1],localTimeKnown:false}],null);
 assert.equal(r.rows.length,1);assert.equal(r.peak,null);assert.deepEqual(r.cleanup,[]);
});

test('tied peaks and multi-hour intervals remain explicit',()=>{
 const r=rainTiming([{...hours[0],precipitationProbabilityPct:60,precipitationWindowHours:6},{...hours[1],precipitationProbabilityPct:60,thunderRisk:true}],null);
 assert.deepEqual(r.peakLabels,['10 AM','11 AM']); assert.equal(r.rows[0].intervalHours,6); assert.equal(r.rows[1].thunder,true);
});
