const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
require.extensions['.ts'] = (module,file) => module._compile(ts.transpileModule(fs.readFileSync(file,'utf8'), {compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,file);
const {formatEventDateTime} = require('../app/lib/eventTime.ts');
test('active RSVP page uses destination-aware formatter and preserves timezone payload',()=>{
 const source=fs.readFileSync(__dirname+'/../app/rsvp.html/page.tsx','utf8');
 assert.match(source,/time_zone\?: string \| null/);
 assert.match(source,/formatEventDateTime\(data\?\.event\?\.starts_at, data\?\.event\?\.time_zone\)/);
 const original=process.env.TZ;
 try {
  for(const zone of ['UTC','America/Los_Angeles','Asia/Tokyo']) {
   process.env.TZ=zone;
   assert.equal(formatEventDateTime('2027-07-05T01:00:00Z','America/New_York'),'Sunday, July 4, 2027 at 9:00 PM EDT');
  }
  assert.equal(formatEventDateTime(null,null),'Date and time to be announced');
  assert.equal(formatEventDateTime('invalid','Asia/Tokyo'),'Date and time to be announced');
  assert.doesNotThrow(()=>formatEventDateTime('2027-07-05T01:00:00Z',null));
 } finally { if(original===undefined) delete process.env.TZ; else process.env.TZ=original; }
});
