import {test} from 'node:test';
import assert from 'node:assert/strict';
import {findLandmark,preferredLandmark} from './landmark.ts';
test('saved weather coordinates select local landmarks and never a distant default',()=>{
 assert.equal(preferredLandmark(37.92,-121.31),'Stockton Channel');
 assert.equal(preferredLandmark(38.63,-90.20),'Gateway Arch');
 assert.equal(preferredLandmark(48.86,2.35),undefined);
});
test('licensed photo includes plain attribution, and missing photo produces no placeholder',async()=>{
 const original=globalThis.fetch;
 try{
 let n=0;
 globalThis.fetch=(async()=>new Response(JSON.stringify(++n===1?{query:{pages:[{title:'Stockton Channel',extract:'A port on the San Joaquin River.',thumbnail:{source:'https://upload.wikimedia.org/photo.jpg'},pageimage:'Port.jpg'}]}}:{query:{pages:[{imageinfo:[{descriptionurl:'https://commons.wikimedia.org/wiki/File:Port.jpg',extmetadata:{Artist:{value:'<a href="x">Photographer</a>'},LicenseShortName:{value:'CC BY-SA 4.0'},LicenseUrl:{value:'https://creativecommons.org/licenses/by-sa/4.0/'}}}]}]}}))) as typeof fetch;
 const result=await findLandmark(37.92,-121.31);
 assert.equal(result?.credit,'Photographer');assert.equal(result?.license,'CC BY-SA 4.0');
 globalThis.fetch=(async()=>new Response(JSON.stringify({query:{pages:[]}}))) as typeof fetch;
 assert.equal(await findLandmark(37.92,-121.31),null);
 }finally{globalThis.fetch=original;}
});
