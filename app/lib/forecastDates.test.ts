import {test} from 'node:test';
import assert from 'node:assert/strict';
import {localWeatherDate,dailyPeriods} from './forecastDates.ts';
test('Stockton stays Thursday after UTC has become Friday',()=>{
 assert.equal(localWeatherDate('America/Los_Angeles',new Date('2026-10-23T01:40:00Z')),'2026-10-22');
 assert.equal(localWeatherDate('America/Los_Angeles',new Date('2026-10-23T07:01:00Z')),'2026-10-23');
});
test('tonight remains before tomorrow when NWS removes the completed daytime forecast',()=>{
 const night={startTime:'2026-10-22T18:00:00-07:00',isDaytime:false};
 const day={startTime:'2026-10-23T06:00:00-07:00',isDaytime:true};
 const nextNight={startTime:'2026-10-23T18:00:00-07:00',isDaytime:false};
 assert.deepEqual(dailyPeriods([night,day,nextNight]),[night,day]);
});
test('daytime period remains preferred while it is available',()=>{
 const day={startTime:'2026-10-22T06:00:00-07:00',isDaytime:true};
 const night={startTime:'2026-10-22T18:00:00-07:00',isDaytime:false};
 assert.deepEqual(dailyPeriods([day,night]),[day]);
});
