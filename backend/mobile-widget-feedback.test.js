const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript'),Module=require('node:module');
function load(file){const m=new Module(file,module);m._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,file);return m.exports;}
const {weatherMood}=load('mobile/src/weatherPresentation.ts');
const {collectResponseWidgetSummary}=load('mobile/src/responseWidgetSummary.ts');
test('clear day code 800 never selects the cloudy plate; hazards and local night remain distinct',()=>{
 const noon=new Date('2026-11-01T20:00:00Z'),night=new Date('2026-11-01T09:00:00Z');
 for(const [code,mood]of [[800,'sunny'],[801,'partly'],[802,'partly'],[803,'cloudy'],[741,'cloudy'],[500,'rain'],[211,'storm'],[601,'snow']])assert.equal(weatherMood(code,'America/Los_Angeles',noon),mood);
 assert.equal(weatherMood(800,'America/Los_Angeles',night),'night');
 assert.equal(weatherMood(211,'America/Los_Angeles',night),'storm');
});
test('owner-only summary includes both reply types without retaining private text',async()=>{
 const calls=[];const data={'/api/events':{events:[{id:'1'}]},'/api/announcements':{announcements:[{id:'a'}]},'/api/announcements/a/manage':{replies:[{message:'private'},{message:'private'}]},'/api/events/1/rsvp-details':{details:[{response:'yes'},{response:'yes'},{response:'maybe'},{response:'no'},{response:null}]}};
 const s=await collectResponseWidgetSummary(async p=>{calls.push(p);return data[p]},123);
 assert.deepEqual(s,{announcements:1,announcementReplies:2,events:1,going:2,maybe:1,declined:1,waiting:1,partial:false,checkedAt:123});assert.ok(!JSON.stringify(s).includes('private'));assert.equal(calls.length,4);
});
test('failed private lookup must not manufacture a zero-response snapshot',async()=>{
 await assert.rejects(collectResponseWidgetSummary(async p=>p==='/api/events'?{events:[{id:'1'}]}:p==='/api/announcements'?{announcements:[]}:Promise.reject(Error('401'))),/401/);
});
test('large-account summaries clearly flag the bounded selection as partial',async()=>{
 const s=await collectResponseWidgetSummary(async p=>p==='/api/events'?{events:[]}:p==='/api/announcements'?{announcements:Array.from({length:21},(_,i)=>({id:String(i)}))}:{replies:[]});assert.equal(s.partial,true);assert.equal(s.announcements,21);
});
