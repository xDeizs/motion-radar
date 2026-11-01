/* Bespoke Motion Radar prologue. No engine modifications and no pointer capture. */
Object.assign(icons,{
 play:'<path d="m9 5 11 7-11 7z"/>',
 pause:'<path d="M8 5v14M16 5v14"/>',
 moon:'<path d="M20.8 13.1A9 9 0 0 1 10.9 3.2 9 9 0 1 0 20.8 13.1z"/>',
 aperture:'<circle cx="12" cy="12" r="9"/><path d="m8 4 5 8m7-5h-9m9 9-5-8m-2 13-4-8m-5 4h9M4 8l5 8"/>',
 book:'<path d="M12 5v15M3 4l9 1 9-1v15l-9 1-9-1z"/>',
 film:'<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 4v16M17 4v16M3 9h4m-4 6h4M17 9h4m-4 6h4"/>',
 gift:'<path d="M4 11h16v10H4zM3 7h18v4H3zM12 7v14"/><path d="M12 7H8a3 3 0 1 1 3-3l1 3zm0 0h4a3 3 0 1 0-3-3l-1 3z"/>',
 layers:'<path d="m3 7 9-5 9 5-9 5zM3 12l9 5 9-5M3 17l9 5 9-5"/>',
 download:'<path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5"/>',
 heart:'<path d="M20.8 5a5.5 5.5 0 0 0-7.8 0l-1 1-1-1a5.5 5.5 0 0 0-7.8 7.8L12 22l8.8-9.2a5.5 5.5 0 0 0 0-7.8z"/>'
});
const flowPrompts=__FLOW_PROMPTS__;
const scene=$('#prologue'),sceneStage=scene.querySelector('.hero-stage'),nodes=$$('.signal-node');
const scenePhone=matchMedia('(max-width:700px)');
let sceneEngine=null,sceneAct=null,sceneFrame=0,sceneView=null,sceneInitialized=false;
let scenePointer={x:0,y:0};let sceneResizeObserver=null;
const smooth01=(x,a,b)=>{const t=Math.max(0,Math.min(1,(x-a)/(b-a)));return t*t*(3-2*t)};
presentation.feed={kicker:'Независимая motion-библиотека',title:'Смотри глубже.<br><span>Делай смелее.</span>',description:'Референсы, код и инструменты.<br>Из любопытства в твой следующий проект.'};
presentation.code.kicker='Код и agent skills';presentation.references.kicker='Карта вдохновения';presentation.lab.kicker='Motion playground';presentation.lab.title='Из идеи<br><span>в движение.</span>';presentation.knowledge.kicker='Твоя база знаний';presentation.free.kicker='Открытые ресурсы';presentation.offers.kicker='Раздачи и пробные версии';presentation.saved.kicker='Твоя коллекция';
$('#hero-visual').src='assets/motion/orbit-v5.webp';
$('#hero-visual').width=1024;$('#hero-visual').height=1024;
$$('[data-symbol]').forEach(e=>e.innerHTML=ico(e.dataset.symbol,20));
const navSymbols={feed:'rss',code:'code',references:'aperture',lab:'play',knowledge:'book',free:'layers',offers:'gift',saved:'bookmark'};
$$('.tab[data-tab]').forEach(b=>{if(!b.querySelector('.nav-symbol'))b.insertAdjacentHTML('afterbegin','<span class="nav-symbol" aria-hidden="true">'+ico(navSymbols[b.dataset.tab],20)+'</span>')});
const footer=$('.footer-actions');
footer.insertAdjacentHTML('afterbegin','<button class="textbtn" data-action="flow-prompts">'+ico('film',16)+' Промпты для Flow</button>');
footer.querySelector('[data-action="export"]').insertAdjacentHTML('afterbegin',ico('download',16));
// Every source can be opened explicitly; the info icon means details, never an undisclosed external hop.
const sceneCard=card;
card=function(r){
 const html=sceneCard(r);const url=safeUrl(r.entry_url||r.url);if(!url)return html;
 const t=document.createElement('template');t.innerHTML=html;const root=t.content.firstElementChild;
 const footer=root.querySelector('.repo-actions,.card-foot');
 if(footer&&!footer.querySelector('.source-link'))footer.insertAdjacentHTML('afterbegin','<a class="source-link" href="'+esc(url)+'" target="_blank" rel="noopener noreferrer">Открыть источник '+ico('arrow',15)+'</a>');
 root.querySelectorAll('.cover-open').forEach(b=>{b.innerHTML=ico('info',18);b.title='О материале';b.setAttribute('aria-label','О материале: '+r.title)});
 return root.outerHTML;
};
function sceneModeOff(){return !motionAllowed()||state.tab!=='feed'}
function stopScene(){
 if(sceneEngine){sceneEngine.destroy();sceneEngine=null;sceneAct=null}
 scene.style.removeProperty('height');scene.style.setProperty('--sc-p','0');scene.classList.remove('sc-act--pinned');
 sceneStage.classList.remove('sc-stage');
 [scene.querySelector('.hero-orbit-stage'),scene.querySelector('.hero-near-stage')].forEach(e=>e.style.removeProperty('transform'));
 scene.querySelectorAll('video').forEach(v=>{v.pause();v.style.opacity='0'});
 document.documentElement.classList.add('scene-static');
}
function startScene(){
 const off=sceneModeOff();
 if(off){stopScene();queueScene();return}
 if(sceneEngine){queueScene();return}
 document.documentElement.classList.remove('scene-static');
 scene.dataset.scSpan=scenePhone.matches?'2.25':'2.8';
 scene.querySelector('.hero-orbit-stage').dataset.scParallax=scenePhone.matches?'-0.5':'-0.9';
 scene.querySelector('.hero-near-stage').dataset.scParallax=scenePhone.matches?'0.7':'1.1';
 if(window.ScrollCraft){
  sceneEngine=ScrollCraft.mount(document,{lerp:scenePhone.matches?.26:.20});sceneAct=sceneEngine.acts.find(a=>a.el===scene);
 }
 queueScene();
}
function queueScene(){if(!sceneFrame)sceneFrame=requestAnimationFrame(paintScene)}
function paintScene(){
 sceneFrame=0;if(state.tab!=='feed')return;
 const staticMode=sceneModeOff(),w=sceneStage.clientWidth,h=sceneStage.clientHeight;
 const raw=sceneAct?sceneAct.p:0,p=staticMode?0:Math.max(0,Math.min(1,raw));
 const dock=smooth01(p,.24,.88),fade=1-smooth01(p,.22,.46),turn=smooth01(p,.44,.66);
 scene.setAttribute('data-sc-verify-state',[p.toFixed(3),dock.toFixed(3),fade.toFixed(3),turn.toFixed(3)].join('|'));
 $('.hero-copy').style.opacity=String(fade);$('.hero-turn').style.opacity=String(turn);
 if(!scenePhone.matches){$('.hero-copy').style.transform='translateY('+(-40-p*28)+'px)';$('.hero-turn').style.transform='translateY('+(16*(1-turn))+'px)'}else{$('.hero-copy').style.transform='translateY('+(-p*10)+'px)';$('.hero-turn').style.transform='translateY('+(10*(1-turn))+'px)'}
 const gap=scenePhone.matches?6:10;
 const bw=nodes[0]?.offsetWidth||94,bh=nodes[0]?.offsetHeight||82;
 const total=bw*nodes.length+gap*(nodes.length-1),pad=scenePhone.matches?(w-total)/2:Math.max(28,w-total-48);
 const spatial=w>=1280;
 const startsX=[.55,.645,.74,.835,.93],startsY=[.17,.44,.19,.62,.40];
 nodes.forEach((b,i)=>{
  const ex=pad+i*(bw+gap),ey=h-(scenePhone.matches?bh+20:bh+62);
  const sx=!spatial?ex:Math.min(w-bw-28,Math.max(w*.46,w*startsX[i]-bw/2));
  const sy=!spatial?ey:h*startsY[i]-bh/2;
  const k=staticMode?1:dock,x=sx+(ex-sx)*k,y=sy+(ey-sy)*k;
  b.style.transform='translate3d('+x.toFixed(2)+'px,'+y.toFixed(2)+'px,0)';
 });
 scene.style.setProperty('--scene-x',scenePointer.x.toFixed(2)+'px');scene.style.setProperty('--scene-y',scenePointer.y.toFixed(2)+'px');
 const video=scene.querySelector('video');
 if(sceneEngine&&sceneEngine.clips[0]?.painted)video.style.opacity='1';
}
scene.addEventListener('pointermove',e=>{
 if(sceneModeOff()||!canHover.matches)return;const r=sceneStage.getBoundingClientRect();
 scenePointer.x=((e.clientX-r.left)/r.width-.5)*12;scenePointer.y=((e.clientY-r.top)/r.height-.5)*10;queueScene();
},{passive:true});
scene.addEventListener('pointerleave',()=>{scenePointer={x:0,y:0};queueScene()},{passive:true});
window.addEventListener('scroll',queueScene,{passive:true});
window.addEventListener('resize',()=>{if(sceneEngine)sceneEngine.layout();queueScene()},{passive:true});
scenePhone.addEventListener('change',()=>{stopScene();startScene()});
scene.querySelector('video').addEventListener('loadeddata',queueScene);
scene.querySelector('video').addEventListener('seeked',queueScene);
function syncSceneButtons(){
 const enabled=motionAllowed(),b=$('#scene-motion-toggle');b.innerHTML=ico(enabled?'pause':'play',18);b.setAttribute('aria-pressed',String(enabled));b.setAttribute('aria-label',enabled?'Выключить движение':'Включить движение');b.title=enabled?'Выключить движение':'Включить движение';
 const isDark=document.documentElement.dataset.theme==='dark'||(!document.documentElement.dataset.theme&&matchMedia('(prefers-color-scheme:dark)').matches);const t=$('#theme');t.innerHTML=ico(isDark?'sun':'moon',18);t.title=isDark?'Светлая тема':'Тёмная тема';
}
$('#scene-motion-toggle').addEventListener('click',()=>$('#motion-toggle').click());
$('#motion-toggle').addEventListener('click',()=>{syncSceneButtons();startScene()});
$('#theme').addEventListener('click',syncSceneButtons);
motionPreference.addEventListener('change',()=>{
 syncSceneButtons();
 if(!motionPreference.matches&&window.ScrollCraft?.reduce){
  stopScene();const script=document.createElement('script');script.src='web/vendor/scrollcraft.js';script.onload=()=>{script.remove();startScene()};script.onerror=()=>{script.remove();stopScene()};document.body.append(script);
 }else startScene();
});
// A real measured ledger. The values come from the current snapshot, not invented marketing figures.
const sceneRender=render;
render=function(){
 sceneRender();
 $$('.signal-node').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.jump===state.tab)));
 if(!sceneInitialized){
  ['items-stat','sources-stat','repos-stat'].forEach(id=>{const e=$('#'+id);const n=Number(e.textContent);if(Number.isFinite(n)&&n>=0)e.dataset.scCount='0 '+n});
  sceneInitialized=true;
 }
 if(sceneView!==state.tab){sceneView=state.tab;startScene()}
 syncSceneButtons();queueScene();
};
function showFlowPrompts(){
 const sections=flowPrompts.split(/\n## /);
 const hero=sections.find(x=>x.startsWith('1. Hero'))||'';
 const bg=sections.find(x=>x.startsWith('2. Фоновая'))||'';
 openModal('Видео для Google Flow','Референсы, точные промпты и безопасная замена видеофона.',
 '<div class="flow-pack"><p>На сайте уже работает тихий видеофон из сгенерированного изображения с движением камеры. Для настоящего изменения ракурса и бликов используй image-to-video в Flow. Генерация в твоём аккаунте не запускалась.</p>'+
 '<div class="flow-pack-actions"><button class="btn primary" data-action="flow-download">'+ico('download',18)+' Скачать пакет .md</button><a class="btn" href="assets/motion/material-bed-v5.mp4" download>Скачать видеофон</a></div>'+
 '<div class="flow-assets"><a href="assets/motion/orbit-reference-v5.webp" download="motion-radar-orbit-reference.webp"><img src="assets/motion/orbit-reference-v5.webp" width="80" height="80" alt="Серебряная орбита">Стартовый кадр: орбита '+ico('download',16)+'</a><a href="assets/motion/background-source-v5.webp" download="motion-radar-macro-reference.webp"><img src="assets/motion/background-source-v5.webp" width="80" height="80" alt="Макро серебряной ленты">Стартовый кадр: фон '+ico('download',16)+'</a></div>'+
 '<h3>Скульптура: медленная орбита</h3><pre class="flow-prompt-text" tabindex="0">'+esc(hero)+'</pre>'+
 '<h3>Фон: движение света по металлу</h3><pre class="flow-prompt-text" tabindex="0">'+esc(bg)+'</pre>'+
 '<p>В скачиваемом пакете есть отдельный мобильный промпт, ограничения и инструкция встраивания. Не оставляй вторую скульптуру поверх видео, которое уже содержит её. Тарифы и возможности Flow зависят от выбранной модели.</p></div>');
}
const v4Credits=showVisualCredits;
showVisualCredits=function(){
 v4Credits();const g=$('#modal .credits-grid');if(g)g.insertAdjacentHTML('afterbegin',
 '<div class="credits-item"><strong>Scroll Craft: реальный движок</strong><p>Используется неизменённый MIT-движок nateherkai/scroll-craft, локально в репозитории. Свой бриф, короткая скролл-сцена, независимые слои, передача управления в библиотеку. Новых API-ключей и платных runtime нет.</p><a href="https://github.com/nateherkai/scroll-craft" target="_blank" rel="noopener noreferrer">Scroll Craft: исходник '+ico('arrow',16)+'</a></div>'+
 '<div class="credits-item"><strong>Orbit / original AI material studies</strong><p>Три новых изображения сгенерированы в этой сессии: складчатая орбита, макро-фон и передний серебряный контур. Это иллюстрации, не фотографии реального товара. WebP-слои с настоящим альфа-каналом. Фоновый MP4 собран движением камеры по изображению; не выдаётся за нативную AI-видеогенерацию. Отдельные portrait/desktop файлы, poster и motion-off.</p><button class="textbtn" data-action="flow-prompts">Промпты и стартовые кадры для Flow '+ico('arrow',16)+'</button></div>');
};
document.addEventListener('click',e=>{const b=e.target.closest('[data-action]');if(!b)return;if(b.dataset.action==='flow-prompts')showFlowPrompts();if(b.dataset.action==='flow-download'){downloadText('Motion-Radar-Google-Flow.md',flowPrompts,'text/markdown;charset=utf-8');toast('Пакет Flow скачан. Генерация не запускалась.')}});
// Disable scripted forms without JS in the base template. Preserve the existing app's secure local-only flows.
syncSceneButtons();
if('ResizeObserver'in window){sceneResizeObserver=new ResizeObserver(queueScene);sceneResizeObserver.observe(sceneStage)}
