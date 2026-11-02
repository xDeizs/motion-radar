import {chromium} from 'playwright';import assert from 'node:assert/strict';import fs from 'node:fs';
const base=process.argv[2]||'http://127.0.0.1:8766',out=process.env.QA_OUT||'/data/analysis/radar-llm-learning/ui';fs.mkdirSync(out,{recursive:true});let checks=0;const errors=[];
const b=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/local/bin/chromium',headless:true,args:['--no-sandbox','--enable-unsafe-swiftshader']});
try{for(const width of [1440,390]){const c=await b.newContext({viewport:{width,height:1100},reducedMotion:'reduce',acceptDownloads:true});const p=await c.newPage();p.on('pageerror',e=>errors.push(e.message));await p.goto(base+'/?view=topics#main',{waitUntil:'domcontentloaded'});await p.waitForTimeout(700);
 assert.equal(await p.locator('[data-learning-preset]').count(),10);checks++;
 assert.equal(await p.locator('.expert-card').count(),2);checks++;
 assert.equal(await p.locator('.catalog-card').count(),12);checks++;
 assert.equal(await p.locator('.workshop-card').count(),3);checks++;
 assert.ok((await p.locator('.topic-status').innerText()).includes('732'));checks++;
 assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true);checks++;
 await prepare('learning-'+width,false);
 await p.locator('[data-library-more]').click();assert.equal(await p.locator('.catalog-card').count(),24);checks++;
 for(const id of ['grok-motion','claude-youtube','claude-scenario','claude-instagram','claude-ceo','claude-animation','claude-character','graphify','characters-opus','claude-skills']){await p.locator('[data-learning-preset='+id+']').click();assert.equal(await p.locator('[data-learning-preset='+id+']').getAttribute('aria-pressed'),'true');assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true);checks++}
 await p.locator('[data-learning-preset=graphify]').click();assert.equal(await p.locator('.catalog-card').count(),0);assert.equal(await p.locator('.expert-card').count(),1);checks++;
 await p.locator('#learning-query').fill('https://127.0.0.1');await p.locator('#learning-form button').click();assert.equal(await p.locator('#learning-error').isVisible(),true);checks++;
 await p.locator('#learning-query').fill('uniqueZZZZ890');await p.locator('#learning-form button').click();assert.equal(await p.locator('.catalog-card').count(),0);assert.equal(await p.locator('.expert-card').count(),0);checks++;
 await prepare('empty-'+width,false);
 await p.locator('#learning-query').fill('Claude YouTube');await p.locator('#learning-form button').click();assert.ok(await p.locator('.catalog-card').count()>0);checks++;
 let dl=p.waitForEvent('download');await p.locator('[data-learning-plan]').click();assert.equal((await dl).suggestedFilename(),'motion-radar-learning-plan.md');checks++;
 await p.locator('[data-learning-preset=claude-animation]').click();await p.locator('[data-expert=learning-damkin]').click();assert.ok((await p.locator('#modal').innerText()).includes('Текст статьи прочитан'));assert.ok((await p.locator('#modal').innerText()).includes('не воспроизведены'));assert.equal(await p.locator('#modal').evaluate(e=>e.scrollWidth<=e.clientWidth+1),true);checks++;
 await prepare('article-'+width,true);await p.keyboard.press('Escape');
 for(const id of ['workflow-engineering','workflow-motion','workflow-intake']){await p.locator('[data-workshop='+id+']').click();assert.ok((await p.locator('#modal').innerText()).includes('не production-tested'));assert.ok(await p.locator('.guide-steps li').count()>=8);assert.equal(await p.locator('#modal').evaluate(e=>e.scrollWidth<=e.clientWidth+1),true);checks++;dl=p.waitForEvent('download');await p.locator('[data-workshop-export='+id+']').click();assert.equal((await dl).suggestedFilename(),id+'.md');checks++;if(id==='workflow-engineering')await prepare('workshop-'+width,true);await p.keyboard.press('Escape')}
 await p.locator('[data-learning-mode=motion]').click();assert.equal(await p.locator('[data-topic-preset]').count(),6);checks++;
 await p.locator('[data-learning-mode=learning]').click();assert.equal(await p.locator('[data-learning-preset]').count(),10);checks++;
 await p.evaluate(()=>{data.library.items[0].title='<img src=x onerror="window.__evil=1">';learningQuery='';learningPreset='claude-skills';data.library.items[0].category='Claude skills';render()});assert.equal(await p.evaluate(()=>window.__evil),undefined);assert.equal(await p.locator('.catalog-card img').count(),0);checks++;
 await c.close();
 async function prepare(name,dialog){const html=await p.evaluate(({base,dialog})=>{const h=document.head.cloneNode(true);h.querySelectorAll('script').forEach(e=>e.remove());const link=document.createElement('base');link.href=base+'/';h.prepend(link);return '<!doctype html><html lang="ru" data-theme="dark" data-motion="off">'+h.outerHTML+'<body data-view="topics">'+document.querySelector('#main').outerHTML+(dialog?document.querySelector('#modal').outerHTML:'')+'<style>.lib{padding-top:40px!important;margin-top:0!important}body{min-height:100vh}dialog[open]{position:fixed;inset:24px 0 auto;max-height:calc(100vh - 48px)}</style></body></html>'},{base,dialog});fs.writeFileSync(out+'/'+name+'.html',html)}
}assert.deepEqual(errors,[]);console.log('PASS:',checks,'learning UI checks; no JavaScript errors.')}finally{await b.close()}
