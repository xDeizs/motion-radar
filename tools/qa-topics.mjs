// Local-only regression checks for v7 topic desk. Run an HTTP server first.
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const base=process.argv[2]||'http://127.0.0.1:8000';
const out=process.env.QA_OUT||'/data/motion-radar-research';
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/local/bin/chromium',headless:true,args:['--no-sandbox','--enable-unsafe-swiftshader']});
let checks=0;const errors=[];
try{
 for(const width of [1440,390]){
  const context=await browser.newContext({viewport:{width,height:1000},reducedMotion:'reduce',acceptDownloads:true});const p=await context.newPage();p.on('pageerror',e=>errors.push(e.message));
  await p.goto(base+'/?view=topics&mode=motion&topic=remotion#main',{waitUntil:'domcontentloaded'});await p.waitForTimeout(700);
  assert.equal(await p.locator('[aria-selected=true]').getAttribute('data-tab'),'topics');checks++;
  assert.equal(await p.locator('[data-topic-preset]').count(),6);checks++;
  assert.ok(await p.locator('.topic-result').count()>=3);checks++;
  assert.equal(await p.locator('.topic-search-links a').count(),4);checks++;
  assert.ok((await p.locator('.topic-status').innerText()).includes('не запускался'));checks++;
  const resultUrls=await p.locator('.topic-result h3 a').evaluateAll(es=>es.map(e=>e.href));assert.ok(resultUrls.every(u=>u.startsWith('https://')));checks++;
  for(const preset of ['claude-motion','grok-video','motion-web','blender','comfyui','remotion']){
   await p.locator('[data-topic-preset='+preset+']').click();
   assert.equal(await p.locator('[data-topic-preset='+preset+']').getAttribute('aria-pressed'),'true');assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true);checks++;
  }
  const dl=p.waitForEvent('download');await p.locator('[data-topic-plan]').click();assert.equal((await dl).suggestedFilename(),'motion-radar-topic-plan.md');checks++;
  await p.locator('[data-topic-access]').click();assert.ok((await p.locator('#modal').innerText()).includes('Postman Enterprise'));await p.keyboard.press('Escape');checks++;
  await p.locator('#topic-query').fill('https://127.0.0.1');await p.locator('#topic-form button').click();assert.equal(await p.locator('#topic-error').isVisible(),true);checks++;
  await p.locator('#topic-query').fill('Unique query 8675309');await p.locator('#topic-form button').click();assert.equal(await p.locator('.topic-result').count(),0);assert.ok((await p.locator('.topic-findings').innerText()).includes('Снимок ещё не собран'));checks++;
  await p.locator('[data-topic-preset=remotion]').click();
  await p.screenshot({path:out+'/topics-'+width+'.png'});
  // Save the already rendered state for the mandatory capture helper as well.
  if(width===1440){let html=await p.content();html=html.replace('<head>','<head><base href="'+base+'/">');fs.writeFileSync(out+'/topics-rendered.html',html)}
  await p.locator('[data-tab=guides]').click();assert.equal(await p.locator('.guide-card').count(),6);checks++;
  assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true);checks++;
  await p.screenshot({path:out+'/guides-'+width+'.png'});
  for(const id of ['guide-claude-motion','guide-remotion','guide-grok-imagine','guide-grok-bot','guide-topic-research','guide-accounts']){
   await p.locator('[data-guide='+id+']').click();assert.ok(await p.locator('.guide-steps li').count()>=5);assert.ok(await p.locator('.guide-prompt').innerText());
   assert.ok(await p.locator('.guide-sources a').count());assert.equal(await p.locator('#modal').evaluate(e=>e.scrollWidth<=e.clientWidth+1),true);checks++;
   if(id==='guide-remotion')await p.screenshot({path:out+'/guide-modal-'+width+'.png'});
   await p.keyboard.press('Escape');
  }
  await p.locator('#search').fill('Grok');assert.equal(await p.locator('.guide-card').count(),2);await p.locator('#search').fill('');checks++;
  await p.locator('[data-guide=guide-remotion]').click();const gdl=p.waitForEvent('download');await p.locator('[data-guide-export=guide-remotion]').click();assert.equal((await gdl).suggestedFilename(),'guide-remotion.md');await p.keyboard.press('Escape');checks++;
  await p.locator('.guide-card [data-save]').first().click();await p.locator('[data-tab=saved]').click();assert.ok(await p.locator('[data-guide]').count());checks++;
  await p.locator('[data-tab=offers]').click();assert.ok(await p.locator('#cards article').count()>=2);assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true);await p.screenshot({path:out+'/access-'+width+'.png'});checks++;
  const collection=await context.request.get(base+'/integrations/Motion-Radar.postman_collection.json');assert.equal(collection.status(),200);const j=await collection.json();assert.equal(j.item.length,4);checks++;
  const docs=await context.request.get(base+'/docs/API_SETUP.md');assert.equal(docs.status(),200);checks++;
  await context.close();
 }
 assert.deepEqual(errors,[]);console.log('PASS: '+checks+' topic/guide UI checks; no JavaScript errors.');
}finally{await browser.close()}
