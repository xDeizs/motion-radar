import {chromium} from 'playwright';import assert from 'node:assert/strict';import fs from 'node:fs';
const base=process.argv[2]||'http://127.0.0.1:8766';const out=process.env.QA_OUT||'/data/analysis/motion-studio-research';fs.mkdirSync(out,{recursive:true});let checks=0;const errors=[];
const b=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/local/bin/chromium',headless:true,args:['--no-sandbox','--enable-unsafe-swiftshader']});
try{for(const width of [1440,390]){
 const c=await b.newContext({viewport:{width,height:1000},reducedMotion:'reduce',acceptDownloads:true});const p=await c.newPage();p.on('pageerror',e=>errors.push(e.message));await p.goto(base+'/?view=research#main',{waitUntil:'domcontentloaded'});await p.waitForTimeout(500);
 assert.equal(await p.locator('[aria-selected=true]').getAttribute('data-tab'),'research');checks++;
 assert.equal(await p.locator('.expert-card').count(),12);checks++;
 await p.locator('#load-more').click();await p.locator('#load-more').click();assert.equal(await p.locator('.expert-card').count(),25);checks++;
 assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true);checks++;
 const scopes=await p.locator('.expert-scope').allTextContents();assert.ok(scopes.includes('Только описание / главы'));checks++;
 await p.locator('[data-expert-platform=YouTube]').click();assert.equal(await p.locator('.expert-card').count(),3);checks++;
 await p.locator('[data-expert-platform=Instagram]').click();assert.equal(await p.locator('.expert-card').count(),1);checks++;
 await p.locator('[data-expert-platform=all]').click();await p.locator('#load-more').click();assert.equal(await p.locator('.expert-card').count(),25);checks++;
 await p.locator('#search').fill('director');assert.equal(await p.locator('.expert-card').count(),1);await p.locator('#search').fill('');checks++;
 const dl=p.waitForEvent('download');await p.locator('[data-expert-context]').click();assert.equal((await dl).suggestedFilename(),'motion-studio-research-context.md');checks++;
 await p.locator('[data-watch-show]').click();assert.equal(await p.locator('.watch-row').count(),10);assert.ok((await p.locator('#modal').innerText()).includes('HTTP 404'));assert.equal(await p.locator('#modal').evaluate(e=>e.scrollWidth<=e.clientWidth+1),true);checks++;
 if(width===1440||width===390)await prepare('watch-'+width,true);
 await p.keyboard.press('Escape');
 if(await p.locator('#load-more').isVisible())await p.locator('#load-more').click();
 for(const id of ['research-whaley','research-yt-official','research-higgsfield']){
  await p.locator('[data-expert='+id+']').click();assert.ok((await p.locator('#modal').innerText()).includes('Граница проверки'));assert.equal(await p.locator('#modal').evaluate(e=>e.scrollWidth<=e.clientWidth+1),true);checks++;
  if(id==='research-whaley'){assert.ok((await p.locator('#modal').innerText()).includes('100 и 200'));await prepare('audit-'+width,true)}
  const download=p.waitForEvent('download');await p.locator('[data-expert-export='+id+']').click();assert.equal((await download).suggestedFilename(),id+'.md');checks++;
  await p.keyboard.press('Escape');
 }
 await p.locator('.expert-card [data-save]').first().click();await p.locator('[data-tab=saved]').click();assert.ok(await p.locator('[data-expert]').count());checks++;
 await p.locator('[data-tab=feed]').click();assert.ok(await p.locator('.signal-card').count());await p.locator('[data-signal]').first().click();assert.ok((await p.locator('#modal').innerText()).includes('не смотрел видео'));await p.keyboard.press('Escape');checks++;
 await p.locator('[data-tab=research]').click();await prepare('research-'+width,false);
 await p.locator('[data-expert-platform=YouTube]').click();await prepare('youtube-'+width,false);
 // Light watcher updates must refresh even when the 6-hour RSS timestamp is unchanged.
 const next=await p.evaluate(()=>JSON.parse(JSON.stringify(data)));next.signals.generated_at=new Date(Date.parse(next.signals.generated_at)+60000).toISOString();next.signals.items[0].title='Refresh regression';
 await p.route('**/data/feed.json?*',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(next)}));
 await p.locator('#refresh').click();await p.waitForTimeout(150);assert.equal(await p.locator('.signal-link strong').first().innerText(),'Refresh regression');checks++;
 // Escape malicious source text, never treat it as HTML.
 await p.evaluate(()=>{data.expert_research[0].summary='<img src=x onerror="window.__evil=1">';render()});assert.equal(await p.evaluate(()=>window.__evil),undefined);checks++;
 await c.close();
 async function prepare(name,dialog){
  const html=await p.evaluate(({base,dialog})=>{const h=document.head.cloneNode(true);h.querySelectorAll('script').forEach(s=>s.remove());const link=document.createElement('base');link.href=base+'/';h.prepend(link);let body=document.querySelector('#main').outerHTML;if(dialog)body+=document.querySelector('#modal').outerHTML;return '<!doctype html><html lang="ru" data-theme="dark" data-motion="off">'+h.outerHTML+'<body data-view="research">'+body+'<style>.lib{padding-top:40px!important;margin-top:0!important}body{min-height:100vh}dialog[open]{position:fixed;inset:24px 0 auto;max-height:calc(100vh - 48px)}</style></body></html>'},{base,dialog});
  fs.writeFileSync(out+'/'+name+'.html',html);
 }
}assert.deepEqual(errors,[]);console.log('PASS:',checks,'research UI checks; no JavaScript errors.');}finally{await b.close()}
