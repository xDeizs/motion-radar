// Optional local UI smoke test. Start python -m http.server 8000 first.
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const base=process.argv[2]||'http://127.0.0.1:8000';
const browser=await chromium.launch({...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{}),headless:true,args:['--no-sandbox','--enable-unsafe-swiftshader']});
let checks=0;const errors=[];
try{
 for(const width of [1440,390]){
  const c=await browser.newContext({viewport:{width,height:1000},reducedMotion:'reduce',acceptDownloads:true});const p=await c.newPage();p.on('pageerror',e=>errors.push(e.message));
  await p.goto(base+'/?view=digest#main',{waitUntil:'domcontentloaded'});await p.waitForTimeout(600);
  for(const tab of ['digest','feed','code','references','lab','knowledge','free','offers','saved']){
   await p.locator('[data-tab='+tab+']').click();await p.waitForTimeout(80);
   assert.equal(await p.locator('[aria-selected=true]').getAttribute('data-tab'),tab);
   assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true,'horizontal overflow on '+tab);
   if(['lab','knowledge'].includes(tab))assert.equal(await p.locator('.filters').isVisible(),false);
   checks++;
  }
  await p.locator('[data-tab=digest]').click();assert.ok(await p.locator('.digest-card').count());
  await p.locator('[data-read]').first().click();assert.ok(await p.locator('.reader-summary').innerText());await p.keyboard.press('Escape');checks++;
  await p.locator('#search').fill('NO_MATCH_8675309');assert.equal(await p.locator('.digest-card').count(),0);await p.locator('[data-digest-reset]').click();checks++;
  const dl=p.waitForEvent('download');await p.locator('[data-digest-export]').click();assert.equal((await dl).suggestedFilename(),'motion-radar-digest.md');checks++;
  await p.locator('[data-save]').first().click();await p.locator('[data-tab=saved]').click();assert.ok(await p.locator('#cards article').count());checks++;
  await p.locator('[data-tab=knowledge]').click();await p.locator('[data-action=note-add]').first().click();
  await p.locator('#note-form [name=title]').fill('Smoke test');await p.locator('#note-form [name=text]').fill('<script>window.__xss=1</script>Local only.');await p.locator('#note-form [type=submit]').click();
  assert.ok(await p.locator('.note-card').count());assert.equal(await p.evaluate(()=>window.__xss),undefined);await p.reload();assert.ok(await p.locator('.note-card').count());checks++;
  await p.locator('[data-tab=lab]').click();if(width===1440)assert.ok(await p.locator('#lab-stage').evaluate(e=>e.clientWidth)>600);
  for(const preset of ['type','cards','path']){await p.locator('#lab-preset').selectOption(preset);assert.ok(await p.locator('#lab-stage').innerText()||await p.locator('#lab-stage svg').count());checks++}
  const labdl=p.waitForEvent('download');await p.locator('[data-action=lab-export]').click();assert.ok((await labdl).suggestedFilename().endsWith('.html'));checks++;
  await c.close();
 }
 assert.deepEqual(errors,[]);console.log('PASS: '+checks+' UI checks; no JavaScript errors.');
}finally{await browser.close()}
