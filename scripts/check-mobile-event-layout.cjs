const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const fs = require('node:fs');
const assert = require('node:assert/strict');
const events = [
  { id: '1', title: 'Family Cookout — Demo', location: 'Stockton, California, United States', starts_at: '2026-10-26T19:00:00Z' },
  { id: '2', title: 'Weekend in the park', location: 'Stockton, CA', starts_at: '2026-11-08T20:00:00Z' },
];
(async () => {
  const browser = await chromium.launch({executablePath:process.env.CHROME_PATH || '/usr/bin/google-chrome',headless:true,args:['--no-sandbox']});
  const page = await browser.newPage({viewport:{width:393,height:852},deviceScaleFactor:1});
  const errors=[]; const deleted=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.addInitScript(()=>localStorage.setItem('family-weather-native-session-v1',JSON.stringify({email:'layout-test@example.invalid',localId:'layout-test',idToken:'fixture',refreshToken:'fixture',expiresAt:Date.now()+3600000})));
  await page.route('**/api/**',route=>{
    const path=new URL(route.request().url()).pathname;
    if(path==='/api/weather/home')return route.fulfill({json:{ok:true,label:'Stockton, CA',timezone:'America/Los_Angeles',current:{temp_f:63,weather_code:800},days:[]}});
    if(path==='/api/events')return route.fulfill({json:{events}});
    if(path==='/api/events/1'&&route.request().method()==='DELETE'){deleted.push(path);return route.fulfill({json:{ok:true}});}
    return route.fulfill({status:404,json:{ok:false,error:'Unexpected fixture request'}});
  });
  await page.goto('http://127.0.0.1:4173');
  await page.getByRole('button',{name:'Events',exact:true}).click();
  await page.getByRole('button',{name:'Delete Family Cookout — Demo',exact:true}).waitFor();
  fs.mkdirSync('build/mobile-layout',{recursive:true});
  for(const width of [320,393,430]){
    await page.setViewportSize({width,height:852});
    const card=page.locator('article.eventListItem').first();
    const button=page.getByRole('button',{name:'Delete Family Cookout — Demo',exact:true});
    const box=await button.boundingBox(),outer=await card.boundingBox();
    assert.ok(box.width>=44 && box.width<=46 && box.height>=44 && box.height<=46,`Delete control stretched at ${width}: ${JSON.stringify(box)}`);
    assert.ok(box.x>=outer.x && box.x+box.width<=outer.x+outer.width,'Delete control outside card');
    assert.ok(outer.width>=width-50,'Event card was squeezed into a narrow column');
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Horizontal page overflow');
    await page.screenshot({path:`build/mobile-layout/events-${width}.png`,fullPage:true});
    console.log(`PASS ${width}px: card ${Math.round(outer.width)}px wide, trash control ${box.width}×${box.height}px`);
  }
  await page.getByRole('button',{name:'Delete Family Cookout — Demo',exact:true}).click();
  await page.getByRole('alertdialog').waitFor();
  await page.getByRole('button',{name:'Keep event',exact:true}).click();
  assert.equal(deleted.length,0);
  await page.getByRole('button',{name:'Delete Family Cookout — Demo',exact:true}).click();
  await page.getByRole('button',{name:'Yes, delete event',exact:true}).click();
  await page.getByRole('button',{name:'Delete Family Cookout — Demo',exact:true}).waitFor({state:'detached'});
  assert.equal(deleted.length,1);
  assert.equal(await page.getByRole('button',{name:'Delete Weekend in the park',exact:true}).count(),1);
  assert.deepEqual(errors,[]);
  await browser.close();
  console.log('PASS: real browser cancel/confirm retains the other event; no page errors');
})().catch(error=>{console.error(error);process.exitCode=1;});
