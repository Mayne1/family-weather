'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),os=require('os'),path=require('path'),{spawnSync}=require('node:child_process');
test('installer routes notification requests past legacy gate once, leaving Firebase authentication in place',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'fw-notify-'));
 try{
  const script=fs.readFileSync(__dirname+'/install-notifications-on-vps.sh','utf8').split("python3 - <<'PY'\n")[1].split('\nPY\n')[0];
  const source='if (req.method === "OPTIONS") return next();\napp.use(makeAnnouncementsRouter(pool, requireFirebaseUser));';
  fs.writeFileSync(path.join(dir,'server.js'),source);
  for(let i=0;i<2;i++){
   const result=spawnSync('python3',['-c',script],{env:{...process.env,API_DIR:dir},encoding:'utf8'});assert.equal(result.status,0,result.stderr);
   fs.copyFileSync(path.join(dir,'server.notifications-candidate.js'),path.join(dir,'server.js'));
  }
  const patched=fs.readFileSync(path.join(dir,'server.js'),'utf8');
  assert.equal(patched.match(/app.use\(makePushRouter\(pool, requireFirebaseUser\)\)/g).length,1);
  const line=patched.split('\n').find(l=>l.includes('req.path === "/notifications/config"'));
  const gate=new Function('req','next',line);let allowed=false;
  for(const [method,url,expected] of [['GET','/notifications/config',true],['POST','/notifications/subscribe',true],['POST','/notifications/status',true],['POST','/notifications/unsubscribe',true],['GET','/notifications/subscribe',false],['POST','/notifications/evil',false],['GET','/private',false]]){
   allowed=false;gate({method,path:url},()=>allowed=true);assert.equal(allowed,expected,method+' '+url);
  }
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
