'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path'),{spawnSync}=require('node:child_process');
test('timezone installer adds one route before legacy handlers and preserves legacy insert',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'fw-zones-'));
 try {
  const script=fs.readFileSync(__dirname+'/install-on-vps.sh','utf8').split("python3 - <<'PY'\n")[1].split('\nPY\n')[0];
  const file=path.join(dir,'server.js');
  const insert='INSERT INTO events (owner_uid, owner_email, title, description, location, starts_at, ends_at) VALUES ($1,$2,$3,$4,$5,$6,$7)';
  fs.writeFileSync(file,'const makeInvitesRouter = require("./routes/invites_pg");\nfunction gate(req,next){const url=req.url; if (req.method === "OPTIONS") return next();}\n// 1) Create an event\nconst query = '+JSON.stringify(insert)+';');
  for(let i=0;i<2;i++) {const result=spawnSync('python3',['-c',script],{env:{...process.env,SERVER_FILE:file},encoding:'utf8'});assert.equal(result.status,0,result.stderr);}
  const patched=fs.readFileSync(file,'utf8');
  assert.equal(patched.match(/app.use\(makeEventTimezonesRouter\(pool, requireFirebaseUser\)\)/g).length,1);
  assert.ok(patched.indexOf('app.use(makeEventTimezonesRouter')<patched.indexOf('// 1) Create an event'));
  assert.ok(patched.includes(insert));
  assert.equal(spawnSync(process.execPath,['--check',file],{encoding:'utf8'}).status,0);
  const block=patched.slice(patched.indexOf('// Destination time-zone endpoints'));
  const gate=new Function('req','next','const url=req.url;\n'+block.slice(0,block.indexOf(') return next();')+16));
  for(const [method,url,expected] of [['POST','/events/zoned',true],['GET','/events/zoned',true],['GET','/events/7/zoned?token=x',true],['PUT','/events/7/zoned',true],['DELETE','/events/7/zoned',false],['GET','/private',false]]) {let allowed=false;gate({method,url},()=>allowed=true);assert.equal(allowed,expected);}
 } finally {fs.rmSync(dir,{recursive:true,force:true});}
});
