'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const planner=fs.readFileSync(path.join(__dirname,'..','app','plan','PlannerTool.tsx'),'utf8');
const css=fs.readFileSync(path.join(__dirname,'..','app','globals.css'),'utf8');
test('hourly rain rail provides touch scrolling and explicit earlier/later controls',()=>{
 assert.match(planner,/ref=\{rainStrip\} className="rainTimingStrip"/);
 assert.match(planner,/scrollBy\(\{ left: -260/);
 assert.match(planner,/scrollBy\(\{ left: 260/);
 assert.match(planner,/Swipe or use the arrows to see every hour/);
 assert.match(css,/\.rainTimingStrip\{[^}]*overflow-x:scroll/);
 assert.match(css,/\.rainTimingStrip\{[^}]*touch-action:pan-x/);
 assert.match(css,/\.plannerResultPage\{min-width:0\}/);
});
