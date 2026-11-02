/* Motion Radar 5 · neon layer: icons, visuals, presentation, modal motion and the bridge to assets/js/experience.js.
   Runs in the same script as main.js and hub.js. Wrapped in a block so names never clash with them. */
{
const designResearch=__DESIGN_NOTES__;
const doc=document.documentElement;
if(doc.dataset.theme!=='light'&&doc.dataset.theme!=='dark')doc.dataset.theme='dark';

/* icons: one 24px stroke family, with tiny hover moves defined in neon.css */
Object.assign(icons,{
 search:'<circle class="i-pop" cx="10.5" cy="10.5" r="6.5"/><path d="m15.6 15.6 4.4 4.4"/>',
 plus:'<path class="i-spin" d="M12 5v14M5 12h14"/>',
 rss:'<circle cx="6" cy="18" r="1.6" fill="currentColor" stroke="none"/><path class="i-wave" d="M5 11.5a7.5 7.5 0 0 1 7.5 7.5"/><path class="i-wave" d="M5 5a14 14 0 0 1 14 14"/>',
 bookmark:'<path class="i-bob" d="M6.5 4h11v16.5L12 16.7l-5.5 3.8z"/>',
 shield:'<path d="m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6z"/><path class="i-pop" d="m8.6 12 2.4 2.4 4.6-5"/>',
 sun:'<circle cx="12" cy="12" r="4"/><path class="i-spin" d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4"/>',
 moon:'<path class="i-bob" d="M19.5 14.6A8 8 0 0 1 9.4 4.5a8 8 0 1 0 10.1 10.1z"/><path class="i-blink" d="M17 3.5v3M15.5 5h3"/>',
 close:'<path class="i-spin" d="m6 6 12 12M6 18 18 6"/>',
 info:'<circle cx="12" cy="12" r="9"/><path d="M12 11v6"/><path class="i-blink" d="M12 7.4v.2"/>',
 arrow:'<path class="i-nudge" d="M7 17 17 7M8.5 7H17v8.5"/>',
 clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2"/>',
 code:'<path d="m8 8-4 4 4 4M16 8l4 4-4 4"/><path class="i-blink" d="M13.6 5 10.4 19"/>',
 radar:'<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4" opacity=".55"/><path class="i-sweep" d="M12 12 18 6"/><circle cx="12" cy="12" r="1.2" fill="currentColor" stroke="none"/>',
 eye:'<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle class="i-pop" cx="12" cy="12" r="3"/>',
 flask:'<path d="M9 3h6M10 3v6.2l-5.2 8.9A2 2 0 0 0 6.5 21h11a2 2 0 0 0 1.7-2.9L14 9.2V3"/><circle class="i-bob" cx="10" cy="16.5" r="1" fill="currentColor" stroke="none"/><circle class="i-bob" cx="14" cy="18" r=".8" fill="currentColor" stroke="none"/>',
 book:'<path d="M5 4.5h10.5a3 3 0 0 1 3 3V20H8a3 3 0 0 1-3-3z"/><path class="i-pop" d="M9 9h6M9 12.5h4"/>',
 unlock:'<rect x="4.5" y="10.5" width="15" height="10" rx="2.5"/><path class="i-bob" d="M8 10.5V7.5a4 4 0 0 1 7.6-1.8"/><circle cx="12" cy="15.5" r="1.2" fill="currentColor" stroke="none"/>',
 ticket:'<path d="M4 7.5h16v3a1.8 1.8 0 0 0 0 3.6v3H4v-3a1.8 1.8 0 0 0 0-3.6z"/><path class="i-blink" d="M14 8.2v1.4M14 11.3v1.4M14 14.4v1.4"/>',
 spark:'<path class="i-spin" d="M12 3v18M3 12h18M5.6 5.6l12.8 12.8M18.4 5.6 5.6 18.4"/>',
 smile:'<circle cx="12" cy="12" r="9"/><path d="M8.5 14.2a4.5 4.5 0 0 0 7 0"/><path class="i-blink" d="M9 9.6v.6M15 9.6v.6"/>'
});
const TAB_ICON={research:'eye',topics:'search',guides:'book',digest:'spark',feed:'radar',code:'code',references:'eye',lab:'flask',knowledge:'book',free:'unlock',offers:'ticket',saved:'bookmark'};
function syncThemeIcon(){
 const dark=doc.dataset.theme!=='light',b=$('#theme');
 b.innerHTML=ico(dark?'sun':'moon');b.setAttribute('aria-label',dark?'Включить светлую тему':'Включить тёмную тему');
 const meta=document.querySelector('meta[name=theme-color]');if(meta)meta.content=dark?'#07070d':'#e9efff';
}
function paintIcons(){
 $('#sources-icon').innerHTML=ico('rss',18);$('#search-icon').innerHTML=ico('search',20);$('#add-icon').innerHTML=ico('plus',18);
 $$('[data-icon]').forEach(e=>e.innerHTML=ico(e.dataset.icon,20));
 $$('[data-ico]').forEach(e=>{e.innerHTML=ico(e.dataset.ico,+(e.dataset.size||18));e.classList.add('ico-wrap')});
 $$('.tab').forEach(t=>{let s=t.querySelector('.tab-ico');if(!s){s=document.createElement('span');s.className='tab-ico';s.setAttribute('aria-hidden','true');t.prepend(s)}s.innerHTML=ico(TAB_ICON[t.dataset.tab]||'info',18)});
 syncThemeIcon();
}

/* source colours and generated covers */
const LOOK={codrops:['#ff4fb3','codrops'],three:['#6f86ff','threejs'],blender:['#ff8a1f','blender'],motion:['#c8ff2e','motion'],r3f:['#35e0ff','r3f'],lottie:['#22d3b6','lottie'],maxime:['#9b6bff','heckel']};
const LOOK_POOL=[['#ff4fb3','codrops'],['#ff4a3d','signal'],['#9b6bff','heckel'],['#35e0ff','r3f'],['#22d3b6','lottie'],['#ff8a1f','blender']];
function lookFor(r){
 const own=LOOK[r&&r.source_id];if(own)return {color:own[0],img:own[1]};
 const t=[r&&r.source_name,r&&r.title,r&&r.type_label,...((r&&r.tags)||[])].join(' ').toLowerCase();
 if(/react three|r3f|fiber/.test(t))return {color:'#35e0ff',img:'r3f'};
 if(/three|webgl|webgpu/.test(t))return {color:'#6f86ff',img:'threejs'};
 if(/blender|geometry nodes/.test(t))return {color:'#ff8a1f',img:'blender'};
 if(/lottie|after effects|bodymovin|rive/.test(t))return {color:'#22d3b6',img:'lottie'};
 if(/shader|glsl|tsl|maxime/.test(t))return {color:'#9b6bff',img:'heckel'};
 if(/motion|gsap|anim|spring|анимац|моушен/.test(t))return {color:'#c8ff2e',img:'motion'};
 const p=LOOK_POOL[parseInt(hash(String((r&&(r.id||r.url||r.title))||'')).slice(-2),16)%LOOK_POOL.length];
 return {color:p[0],img:p[1]};
}
const coverSrc=n=>'assets/img/cover-'+n+'.webp';
const coverImg=n=>'<img src="'+coverSrc(n)+'" alt="" loading="lazy" decoding="async" width="800" height="498">';
const neonCard=card;
card=function(r){
 const html=neonCard(r);
 if(r.kind==='repository'||r.kind==='reference'||r.category==='reference')return html;
 const t=document.createElement('template');t.innerHTML=html;const el=t.content.firstElementChild;if(!el)return html;
 const look=lookFor(r);el.style.setProperty('--c',look.color);
 const cover=el.querySelector('.cover');
 if(cover&&(cover.classList.contains('release')||cover.classList.contains('article-fallback')))cover.insertAdjacentHTML('afterbegin',coverImg(look.img));
 return t.innerHTML;
};
const neonRepoCard=repoCard;
repoCard=function(r){
 const t=document.createElement('template');t.innerHTML=neonRepoCard(r);
 const el=t.content.firstElementChild,top=el&&el.querySelector('.repo-top');if(!top)return t.innerHTML;
 const look=lookFor(r);el.style.setProperty('--c',look.color);
 const cover=document.createElement('div');cover.className='repo-visual';cover.innerHTML=coverImg(look.img);
 const type=top.querySelector('.repo-type'),save=top.querySelector('.save');if(save)save.classList.remove('repo-save');
 if(type)cover.append(type);if(save)cover.append(save);top.remove();el.prepend(cover);return t.innerHTML;
};
const neonReferenceCard=referenceCard;
referenceCard=function(r){
 const t=document.createElement('template');t.innerHTML=neonReferenceCard(r);
 const el=t.content.firstElementChild,cover=t.content.querySelector('.reference-cover'),look=lookFor(r);
 if(el)el.style.setProperty('--c',look.color);
 if(cover)cover.insertAdjacentHTML('afterbegin','<img src="'+(r.type==='profile'?'assets/img/look-sm.webp':coverSrc(look.img))+'" alt="" loading="lazy" decoding="async">');
 return t.innerHTML;
};

/* motion preferences */
const motionPreference=matchMedia('(prefers-reduced-motion:reduce)');
const motionAllowed=()=>!motionPreference.matches&&doc.dataset.motion!=='off';
let inputModality='pointer',uiAnimations=[];
document.addEventListener('keydown',()=>{inputModality='keyboard';doc.dataset.input='keyboard'},{capture:true,passive:true});
document.addEventListener('pointerdown',()=>{inputModality='pointer';doc.dataset.input='pointer'},{capture:true,passive:true});
function syncMotionButton(){const b=$('#motion-toggle');b.textContent=motionAllowed()?'Движение: вкл.':'Движение: выкл.';b.setAttribute('aria-pressed',String(motionAllowed()));b.title=motionPreference.matches?'В системе включено уменьшение движения':'Настройка анимации только для этого браузера'}
function cancelUIAnimation(){uiAnimations.forEach(a=>a.cancel());uiAnimations=[]}
function enterElement(el,{delay=0,duration=420,distance=14,blur=0}={}){
 if(!el||!motionAllowed()||inputModality==='keyboard'||!el.animate)return;
 const frames=[{opacity:0,transform:'translateY('+distance+'px)',...(blur?{filter:'blur('+blur+'px)'}:{})},{opacity:1,transform:'translateY(0)',...(blur?{filter:'blur(0px)'}:{})}];
 const a=el.animate(frames,{duration,delay,easing:'cubic-bezier(.22,1,.36,1)',fill:'backwards'});uiAnimations.push(a);
 a.finished.then(()=>{uiAnimations=uiAnimations.filter(x=>x!==a)}).catch(()=>{});
}
function enterView(){
 if(!motionAllowed()||inputModality==='keyboard')return;
 cancelUIAnimation();
 enterElement($('#lib-title'),{duration:560,distance:24,blur:4});
 enterElement($('#lib-lede'),{duration:520,delay:70,distance:14});
 if($('#hub-extra').firstElementChild)enterElement($('#hub-extra'),{duration:460,delay:60,distance:14});
 $$('#cards > *').slice(0,9).forEach((el,i)=>enterElement(el,{duration:620,delay:110+i*50,distance:28}));
}

/* presentation per view */
const presentation={
 research:{title:'Из находки<br><span class="hl">в технику.</span>',lede:'Код, тексты и честная граница проверки. Разбираем механизм — не верим обещаниям.'},
 topics:{title:'Не весь интернет.<br><span class="hl">Твоя тема.</span>',lede:'Публичные источники, ограниченный сбор и честный статус каждого подключения. Без ключей в браузере.'},
 guides:{title:'От идеи<br><span class="hl">к движению.</span>',lede:'Claude, Remotion и Grok: шаги, промпты и документация. Разные инструменты — разные права доступа.'},
 digest:{title:'Вникай в суть.<br><span class="hl">Забирай в работу.</span>',lede:'Статьи, AI-отбор фрагментов и рабочие идеи с прозрачным происхождением. Оригиналы остаются у авторов.'},
 feed:{title:'Всё свежее.<br><span class="hl">В одном месте.</span>',lede:'Статьи и релизы из открытых лент. Сохраняй находки, изучай оригиналы и забирай идеи в работу.'},
 code:{title:'Код, который<br><span class="hl">двигает.</span>',lede:'Skills для coding-агента, библиотеки и скрипты с понятным происхождением. Сайт ничего не устанавливает сам.'},
 references:{title:'Смотри глубже.<br><span class="hl">Делай своё.</span>',lede:'Авторы и проекты для внимательного взгляда: композиция, материал, ритм и механика движения.'},
 lab:{title:'Из «а что, если»<br><span class="hl">в движение.</span>',lede:'Три сцены на Web Animations и SVG. Меняй текст, темп и акцент, а потом скачивай HTML с кодом.'},
 knowledge:{title:'Не просто промпт.<br><span class="hl">Твоя база.</span>',lede:'Статьи, требования и наблюдения, которые помогают coding-агенту понять задачу. Всё хранится в этом браузере.'},
 free:{title:'Открыто для<br><span class="hl">твоих идей.</span>',lede:'Бесплатные инструменты и ассеты. У каждого свои условия, поэтому лицензия проверяется отдельно.'},
 offers:{title:'Хорошие находки.<br><span class="hl">Честные условия.</span>',lede:'Без выдуманных акций и вечных таймеров. Сначала источник и условия, потом работа.'},
 saved:{title:'Хорошие идеи<br><span class="hl">не теряются.</span>',lede:'Твоя коллекция без аккаунта. Экспортируй её, чтобы сохранить резервную копию.'}
};
const headings={feed:'Свежие сигналы',code:()=>codeMode==='discovery'?'Новые находки GitHub':'Подборка репозиториев',references:'Карта вдохновения',lab:'Твоя motion-песочница',knowledge:'Личные материалы',free:'Инструменты и ассеты',offers:'Предложения из источников',saved:'Твоя коллекция'};
const knowledgeFeature='<article class="knowledge-feature"><div><span class="kf-label">Встроенный разбор</span><h3>От референса<br>к своей системе.</h3><p>Мудборд, scroll-craft, Three.js Journey и прошлые версии сайта: большая выжимка с решениями для Motion Radar.</p></div><button class="btn" data-action="design-research">Читать разбор <span class="ico-wrap">'+ico('arrow',18)+'</span></button></article>';

/* stage content built from the real snapshot */
const MR=window.MR={
 lenis:null,stageData:null,listeners:{},
 on(ev,fn){(this.listeners[ev]||(this.listeners[ev]=[])).push(fn)},
 emit(ev,d){(this.listeners[ev]||[]).forEach(fn=>{try{fn(d)}catch(err){console.error(err)}})},
 data:()=>data,lookFor,coverSrc,motionAllowed:()=>motionAllowed(),initialView:state.tab,
 openDetail:id=>detailModal(id),
 go(tab,opts={}){
  if(tab&&presentation[tab]&&state.tab!==tab)setTab(tab);
  const main=$('#main'),instant=opts.instant||!motionAllowed();
  if(MR.lenis&&!instant)MR.lenis.scrollTo(main,{duration:1.35,easing:t=>1-Math.pow(1-t,4)});
  else main.scrollIntoView({block:'start',behavior:'auto'});
  main.focus({preventScroll:true});
 }
};
function hoursWord(n){const a=n%10,b=n%100;return a===1&&b!==11?'час':a>=2&&a<=4&&!(b>=12&&b<=14)?'часа':'часов'}
function latest(n){return [...data.items].filter(r=>safeUrl(r.url)).sort((a,b)=>(b.published_at||b.seen_at||'').localeCompare(a.published_at||a.seen_at||'')).slice(0,n)}
const titleOf=r=>r.kind==='release'?r.source_name+' · '+r.title:r.title;
function buildStage(){
 const ticks=latest(12).map(r=>'<span class="tick" style="--c:'+lookFor(r).color+'"><b>'+esc(r.source_name)+'</b>'+esc(titleOf(r))+'</span>').join('');
 $('#ticker').innerHTML=ticks+ticks;
 const words=['Идеи','Код','Движение','Референсы','Skills','Шейдеры','Лаборатория'].map(w=>'<span>'+w+'</span><i>✳</i>').join('');
 $('#tape-a').innerHTML=words+words+words;
 const names=data.sources.map(s=>s.name);
 const srcs=names.map(n=>'<span>'+esc(n)+'</span><i>●</i>').join('');
 $('#tape-b').innerHTML=srcs+srcs+srcs;
 const h=Number(data.meta.refresh_hours)||6;
 if(names.length)$('#manifesto-text').innerHTML='Каждые '+h+' '+hoursWord(h)+' радар читает открытые ленты: <b>'+names.map(esc).join(', ')+'</b>. Ты получаешь короткий фрагмент, ссылку на оригинал и честный статус проверки.';
 const blips=latest(8);
 $('#radar-list').innerHTML=blips.map((r,i)=>'<li><button class="blip-row" data-detail="'+esc(r.id)+'" data-blip="'+i+'" style="--c:'+lookFor(r).color+'"><span class="blip-dot" aria-hidden="true"></span><span class="blip-title">'+esc(titleOf(r))+'</span><span class="blip-meta">'+esc(r.source_name)+' · '+esc(fmtDate(r.published_at||r.seen_at))+'</span></button></li>').join('');
 MR.stageData={blips:blips.map(r=>({id:r.id,title:titleOf(r),source:r.source_name,color:lookFor(r).color,date:r.published_at||r.seen_at||''}))};
 MR.emit('stage',MR.stageData);
}

let previousView=null,stageStamp=null;
const neonRender=render;
render=function(){
 const viewChanged=previousView!==state.tab,first=previousView===null;
 document.body.dataset.view=state.tab;
 neonRender();
 $('#repos-stat').textContent=catalog().length+discoveries().length;
 const p=presentation[state.tab]||presentation.feed;
 if(viewChanged){$('#lib-title').innerHTML=p.title;$('#lib-lede').textContent=p.lede}
 const h=headings[state.tab];$('#section-title').textContent=typeof h==='function'?h():h;
 if(state.tab==='feed')$('#section-intro').textContent='Материалы из открытых источников. Сохраняй, изучай оригинал и забирай нужное в работу.';
 if(state.tab==='references')$('#section-intro').textContent='Обложки здесь это иллюстрации Motion Radar, а не скриншоты проектов. Изучаем приёмы и открываем оригиналы, чужие ассеты не копируем.';
 if(state.tab==='knowledge')$('#hub-extra').insertAdjacentHTML('beforeend',knowledgeFeature);
 $$('.version').forEach(el=>el.classList.toggle('version-long',el.textContent.length>14));
 if(stageStamp!==data.meta.generated_at){stageStamp=data.meta.generated_at;buildStage()}
 if(viewChanged&&!first)enterView();
 previousView=state.tab;syncMotionButton();
 MR.emit('render',{viewChanged,first});
};

/* modal: material art, soft enter and exit, smooth scroll paused while open */
const neonDetailModal=detailModal;
detailModal=function(id){
 neonDetailModal(id);const r=allRecords().find(x=>x.id===id);if(!r||!modal.open)return;
 const body=$('#modal .dialog-body');if(!body||body.querySelector('.modal-material-art'))return;
 const look=lookFor(r);
 const img=r.thumbnail&&safeUrl(r.thumbnail)?'<img src="'+esc(safeUrl(r.thumbnail))+'" alt="" loading="lazy" referrerpolicy="no-referrer">':coverImg(look.img);
 body.insertAdjacentHTML('afterbegin','<div class="modal-material-art" style="--c:'+look.color+'" aria-hidden="true">'+img+'<span>'+esc(r.kind==='repository'?(r.type_label||'Код и skills'):(r.source_name||'Сигнал'))+'</span></div>');
};
const neonOpenModal=openModal;
let modalExitAnimation=null;
const instantModalClose=modal.close.bind(modal);
openModal=function(title,subtitle,body){
 if(modalExitAnimation){modalExitAnimation.cancel();modalExitAnimation=null}
 neonOpenModal(title,subtitle,body);modal.scrollTop=0;if(MR.lenis)MR.lenis.stop();
 enterElement(modal,{duration:340,distance:16,blur:2});
};
modal.close=function(value){
 if(!modal.open)return;
 if(modalExitAnimation){modalExitAnimation.cancel();modalExitAnimation=null}
 if(!motionAllowed()||inputModality==='keyboard'||!modal.animate){instantModalClose(value);return}
 const a=modal.animate([{opacity:1,transform:'translateY(0)'},{opacity:0,transform:'translateY(8px)'}],{duration:170,easing:'cubic-bezier(.3,0,.9,.7)'});
 modalExitAnimation=a;a.finished.then(()=>{if(modalExitAnimation===a){modalExitAnimation=null;instantModalClose(value)}}).catch(()=>{});
};
modal.addEventListener('cancel',e=>{e.preventDefault();inputModality='keyboard';modal.close()});
modal.addEventListener('close',()=>{if(MR.lenis)MR.lenis.start()});

/* tabs: keep the reader at the top of the new list */
function jumpTo(y){if(MR.lenis)MR.lenis.scrollTo(y,{immediate:true,force:true});else window.scrollTo({top:y,behavior:'instant'})}
const neonSetTab=setTab;
setTab=function(t){
 if(!presentation[t])return;
 const below=$('#content').getBoundingClientRect().top<0;
 neonSetTab(t);
 if(below)jumpTo(window.scrollY+$('#main').getBoundingClientRect().top);
 if(inputModality==='keyboard')cancelUIAnimation();
};
window.addEventListener('popstate',()=>{const t=new URLSearchParams(location.search).get('view')||'feed';if(presentation[t]){state.tab=t;reset()}});

function refreshMotion(){cancelUIAnimation();labAnimations.forEach(a=>a.cancel());if(state.tab==='lab')refreshScene();syncMotionButton();MR.emit('motion',motionAllowed())}
motionPreference.addEventListener('change',refreshMotion);
$('#motion-toggle').addEventListener('click',()=>{
 const off=doc.dataset.motion!=='off';
 if(off)doc.dataset.motion='off';else delete doc.dataset.motion;
 store('mr.motion',!off);refreshMotion();
 toast(motionPreference.matches?'В системе включено уменьшение движения, поэтому сцены остаются статичными.':off?'Движение выключено для этого браузера.':'Движение включено.');
});
$('#theme').addEventListener('click',()=>{syncThemeIcon();MR.emit('theme',doc.dataset.theme)});

function showDesignResearch(){
 openModal('Design field notes','Мудборд, scroll-craft, Three.js Journey и решения для Motion Radar.',
  '<div class="callout blue">Самостоятельный разбор открытых страниц и присланных визуалов. Не копия платных компонентов или закрытых инструкций. С источниками, ограничениями и решениями для этого сайта.</div>'+
  '<div class="design-actions"><button class="btn primary" data-action="design-download">Скачать выжимку .md</button><button class="btn" data-action="design-save">В личные материалы</button></div>'+
  '<div class="design-excerpt" tabindex="0">'+esc(designResearch)+'</div>');
}
function showVisualCredits(){
 const a=(u,t)=>'<a href="'+u+'" target="_blank" rel="noopener noreferrer">'+t+' <span class="ico-wrap">'+ico('arrow',14)+'</span></a>';
 openModal('Дизайн, движение и изображения','Собственный интерфейс и прозрачное происхождение материалов.',
 '<div class="credits-grid">'+
 '<div class="credits-item"><strong>Ночная LED-студия</strong><p>Собственная дизайн-система Motion Radar 5: шрифты Unbounded и Onest (SIL Open Font License, файлы лежат в репозитории), кобальт, лайм и LED-цвета источников. Настроение собрано из присланного мудборда: ледяная fashion-съёмка, коллажи с лентами, рваная бумага, LED-вывески, клавиши и виниловые арт-игрушки. Чужие изображения и компоненты не перенесены.</p><button class="textbtn" data-action="design-research">Читать большой разбор</button></div>'+
 '<div class="credits-item"><strong>3D и скролл</strong><p>Клавиши и мыльные пузыри в первом экране собраны в коде на Three.js (MIT): геометрия, материалы и надписи генерируются в браузере. Скролл-сцены работают на GSAP и ScrollTrigger (стандартная бесплатная лицензия GSAP) и Lenis (MIT). Принципы хореографии взяты из открытого набора scroll-craft Нейта Херка (MIT).</p><p>Если в системе включено уменьшение движения или движение выключено кнопкой внизу, сцены показываются статично.</p>'+a('https://threejs.org/','Three.js')+a('https://gsap.com/standard-license','Лицензия GSAP')+a('https://github.com/darkroomengineering/lenis','Lenis')+a('https://github.com/nateherkai/scroll-craft','scroll-craft')+'</div>'+
 '<div class="credits-item"><strong>Оригинальные 3D-иллюстрации · AI</strong><p>Талисман с головой-радаром, клавиша, набор объектов и восемь обложек источников созданы для Motion Radar генеративной моделью. Это не реальные товары и не скриншоты проектов. На сайте нет API генерации и списаний за изображения.</p></div>'+
 '<div class="credits-item"><strong>LED-стена</strong><p>Фоновое видео в манифесте отрисовано процедурно: canvas, затем ffmpeg. Без стоковых файлов и звука. Промпты для собственных роликов в Google Flow лежат в FLOW_PROMPTS.md.</p></div>'+
 '<div class="credits-item"><strong>Обложка не доказательство</strong><p>Изображения из RSS принадлежат авторам материалов. Иллюстрации не подтверждают качество, безопасность или лицензию проекта. Ссылки и условия проверяются отдельно. Личные тексты и закладки не публикуются.</p></div></div>');
}
function toTop(){if(MR.lenis&&motionAllowed())MR.lenis.scrollTo(0,{duration:1.6});else window.scrollTo({top:0,behavior:motionAllowed()?'smooth':'auto'})}
document.addEventListener('click',e=>{
 const go=e.target.closest('[data-go]');
 if(go){e.preventDefault();MR.go(go.dataset.go);return}
 if(e.target.closest('a.brand')){toTop();return}
 const b=e.target.closest('[data-action]');if(!b)return;
 switch(b.dataset.action){
  case 'to-top':toTop();break;
  case 'visual-credits':showVisualCredits();break;
  case 'design-research':showDesignResearch();break;
  case 'design-download':downloadText('motion-radar-design-research.md',designResearch,'text/markdown;charset=utf-8');toast('Разбор скачан. Источники и ограничения внутри.');break;
  case 'design-save':
   try{importKnowledge([{id:'mr-design-research-v5',title:'Design field notes · полный разбор референсов',text:designResearch,url:'https://github.com/xDeizs/motion-radar/blob/main/DESIGN_RESEARCH.md',updated_at:new Date().toISOString()}]);store('mr.knowledge',knowledge);modal.close();MR.go('knowledge');toast('Разбор сохранён только в этом браузере. В модель ничего не отправлено.')}
   catch(err){toast(err.message||'Не удалось сохранить разбор.')}
   break;
 }
});

/* header hides while reading down, returns on the way up */
{
 const top=$('#top');let lastY=window.scrollY,ticking=false;
 const setHidden=v=>{top.classList.toggle('is-hidden',v);doc.classList.toggle('header-hidden',v)};
 addEventListener('scroll',()=>{if(ticking)return;ticking=true;requestAnimationFrame(()=>{ticking=false;const y=window.scrollY,dy=y-lastY;if(Math.abs(dy)<6)return;setHidden(dy>0&&y>innerHeight*.7&&!top.contains(document.activeElement));lastY=y})},{passive:true});
 top.addEventListener('focusin',()=>setHidden(false));
}
/* blip rows talk to the radar canvas */
$('#radar-list').addEventListener('pointerover',e=>{const b=e.target.closest('[data-blip]');MR.emit('blip-hover',b?+b.dataset.blip:-1)});
$('#radar-list').addEventListener('pointerleave',()=>MR.emit('blip-hover',-1));
$('#radar-list').addEventListener('focusin',e=>{const b=e.target.closest('[data-blip]');if(b)MR.emit('blip-hover',+b.dataset.blip)});
$('#radar-list').addEventListener('focusout',()=>MR.emit('blip-hover',-1));
/* first arrival in the library gets a short stagger */
if('IntersectionObserver' in window){
 const io=new IntersectionObserver(es=>{if(es.some(x=>x.isIntersecting)){io.disconnect();if(motionAllowed()&&inputModality!=='keyboard')$$('#cards > *').slice(0,6).forEach((el,i)=>enterElement(el,{duration:700,delay:i*70,distance:34}))}},{rootMargin:'0px 0px -25% 0px'});
 io.observe($('#cards'));
}
paintIcons();
if(state.tab!=='feed')requestAnimationFrame(()=>$('#main').scrollIntoView({block:'start'}));
}
