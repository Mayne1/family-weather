'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),ts=require('typescript'),Module=require('module');
// Load the actual route and helpers with Next's server-only boundary stubbed for Node tests.
const load=Module._load;
Module._load=function(id,...args){return id==='server-only'?{}:load.call(this,id,...args);};
require.extensions['.ts']=(module,file)=>module._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText,file);
const {GET}=require('../app/api/weather/home/route.ts');
Module._load=load;
const day=(offset)=>new Date(Date.now()+offset*86400000).toISOString().slice(0,10);
const reply=data=>({ok:true,json:async()=>data});
const point={properties:{forecast:'https://api.weather.gov/test/forecast',observationStations:'https://api.weather.gov/test/stations',timeZone:'UTC',relativeLocation:{properties:{city:'Test City',state:'CA'}}}};
const forecast={properties:{periods:Array.from({length:5},(_,i)=>({startTime:day(i)+'T12:00:00+00:00',isDaytime:true,temperature:70,probabilityOfPrecipitation:{value:0},windSpeed:'5 mph'}))}};
const observation={properties:{timestamp:new Date().toISOString(),temperature:{value:20},relativeHumidity:{value:50},windSpeed:{value:8}}};
const req=()=>({nextUrl:new URL('https://thefamilyweather.com/api/weather/home?lat=37.9&lon=-121.3')});
test('complete NWS data returns without waiting for unused slow backup services',async()=>{
 const original=global.fetch;const calls=[];let release;const held=new Promise(resolve=>{release=resolve;});
 global.fetch=async(url,options)=>{calls.push({url:String(url),options});const u=String(url);
  if(u.includes('air-quality'))return reply({});
  if(u.includes('/points/'))return reply(point);
  if(u.endsWith('/test/forecast'))return reply(forecast);
  if(u.endsWith('/test/stations'))return reply({features:[{id:'https://api.weather.gov/stations/TEST'}]});
  if(u.endsWith('/observations/latest'))return reply(observation);
  if(u.includes('/observations?'))return reply({features:[observation]});
  await held;return {ok:false};
 };
 let timer;
 try{
  const response=await Promise.race([GET(req()),new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('Ready NWS data waited for a blocked fallback')),500);})]);
  const data=await response.json();assert.equal(data.ok,true);assert.equal(data.current_source,'nws-observation');assert.equal(data.current.temp_f,68);assert.equal(data.days.length,5);
  assert.equal(calls.find(c=>c.url.includes('/points/')).options.next.revalidate,3600);
  assert.equal(calls.find(c=>c.url.endsWith('/observations/latest')).options.next.revalidate,60);
 }finally{clearTimeout(timer);release();global.fetch=original;}
});
test('unavailable official services still use backend and calendar fallback data',async()=>{
 const original=global.fetch;
 global.fetch=async url=>{const u=String(url);
  if(u.includes('/weather/current'))return reply({current:{temp_f:74,wind_mph:4}});
  if(u.includes('/weather/forecast10'))return reply({days:[]});
  if(u.includes('/v1/forecast'))return reply({timezone:'UTC',current:{relative_humidity_2m:42},daily:{time:[day(0)],weather_code:[0],temperature_2m_max:[75],temperature_2m_min:[50],precipitation_probability_max:[5],wind_speed_10m_max:[8]}});
  return {ok:false};
 };
 try{const data=await(await GET(req())).json();assert.equal(data.ok,true);assert.equal(data.current.temp_f,74);assert.equal(data.current.humidity_pct,42);assert.equal(data.days[0].date,day(0));assert.equal(data.source,'open-meteo');}finally{global.fetch=original;}
});
test('total provider failure returns unavailable instead of fabricated weather',async()=>{
 const original=global.fetch;global.fetch=async()=>({ok:false});
 try{const response=await GET(req());assert.equal(response.status,502);assert.equal((await response.json()).ok,false);}finally{global.fetch=original;}
});
