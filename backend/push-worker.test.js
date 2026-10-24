'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('fs');
function worker(){
 const handlers={},shown=[],opened=[];let badge=0;
 const self={location:{origin:'https://thefamilyweather.com'},addEventListener:(name,fn)=>handlers[name]=fn,
 registration:{showNotification:async(title,options)=>shown.push({title,...options})},navigator:{setAppBadge:async()=>badge++,clearAppBadge:async()=>badge=0},
 clients:{matchAll:async()=>[],openWindow:async(url)=>opened.push(url)}};
 vm.runInNewContext(fs.readFileSync(__dirname+'/../public/reply-notifications-sw.js','utf8'),{self,URL});
 return{handlers,shown,opened,badge:()=>badge};
}
test('background push displays a notification and badge without an open page',async()=>{
 const w=worker();let work;
 w.handlers.push({data:{json:()=>({body:'Someone replied.',tag:'reply-1',url:'/announcements?announcement=abc'})},waitUntil:p=>work=p});await work;
 assert.equal(w.shown[0].title,'Family Weather');assert.equal(w.shown[0].body,'Someone replied.');assert.equal(w.badge(),1);
});
test('notification click opens the correct private destination and rejects external URLs',async()=>{
 for(const [target,expected] of [['/events/12','/events/12'],['/announcements?announcement=abc','/announcements?announcement=abc'],['https://evil.test/steal','/events'],['javascript:alert(1)','/events']]){
 const w=worker();let work;w.handlers.notificationclick({notification:{close(){},data:{url:target}},waitUntil:p=>work=p});await work;
 assert.equal(w.opened[0],'https://thefamilyweather.com'+expected);
 }
});
