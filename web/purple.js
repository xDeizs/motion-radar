/* Motion Radar 4. Original design; native CSS / WAAPI, no third-party runtime. */
const visuals=__VISUALS__;
const designResearch=__DESIGN_NOTES__;
const visualById=new Map((visuals.images||[]).filter(x=>x&&/^data:image\/webp;base64,[A-Za-z0-9+/=]+$/.test(x.src)).map(x=>[x.id,x]));
function visualImage(id,extra=''){
 const v=visualById.get(id);return v?'<img class="theme-visual '+extra+'" src="'+v.src+'" alt="" loading="lazy" decoding="async" width="'+v.width+'" height="'+v.height+'">':'';
}
function visualFor(r){
 if(/исследован|research/i.test(r.type_label||''))return 'tunnel';
 if(/библиотек|library/i.test(r.type_label||''))return 'sculpture';
 if(/shader|glsl|three|maxime/i.test([r.source_name,r.title,...(r.tags||[])].join(' ')))return 'glass';
 return ['sculpture','silk','glass'][parseInt(hash(r.id||r.url||r.title).slice(-2),16)%3];
}
const visualRepoCard=repoCard;
repoCard=function(r){
 const t=document.createElement('template');t.innerHTML=visualRepoCard(r);
 const root=t.content.firstElementChild,top=root.querySelector('.repo-top');
 const cover=document.createElement('div');cover.className='repo-visual';
 const label=/исследован/i.test(r.type_label||'')?'LOOK.<br>DEEPER.':/библиотек/i.test(r.type_label||'')?'MAKE<br>IT MOVE.':/типограф|kinetic/i.test([r.title,...(r.tags||[])].join(' '))?'TYPE<br>IN MOTION.':'MOTION<br>TOOLKIT.';
 cover.innerHTML=visualImage(visualFor(r))+'<span class="repo-cover-title" aria-hidden="true">'+label+'</span><span class="visual-caption">Иллюстрация / MR</span><button class="cover-open" data-detail="'+esc(r.id)+'" aria-label="Разобрать материал: '+esc(r.title)+'">↗</button>';
 const type=top.querySelector('.repo-type'),save=top.querySelector('.save');save.classList.remove('repo-save');cover.append(type,save);top.remove();root.prepend(cover);return root.outerHTML;
};
const visualReferenceCard=referenceCard;
referenceCard=function(r){
 const t=document.createElement('template');t.innerHTML=visualReferenceCard(r);
 const cover=t.content.querySelector('.reference-cover');
 const id=r.type==='profile'?'tunnel':r.id==='chen-media'?'glass':/three|pinterest/.test(r.id)?'sculpture':'silk';
 cover.insertAdjacentHTML('afterbegin',visualImage(id));
 cover.insertAdjacentHTML('beforeend','<span class="visual-caption">Иллюстрация / не скриншот</span><button class="cover-open" data-detail="'+esc(r.id)+'" aria-label="Что изучено: '+esc(r.title)+'">↗</button>');
 return t.innerHTML;
};
const visualCard=card;
card=function(r){
 const html=visualCard(r);if(r.kind==='repository'||r.kind==='reference'||r.category==='reference')return html;
 const t=document.createElement('template');t.innerHTML=html;const cover=t.content.querySelector('.cover');
 if(cover){
  if(cover.classList.contains('release')||cover.classList.contains('article-fallback')){
   cover.insertAdjacentHTML('afterbegin',visualImage(visualFor(r)));cover.setAttribute('aria-label','Тематическая иллюстрация, не скриншот проекта');
  }
  cover.insertAdjacentHTML('beforeend','<button class="cover-open" data-detail="'+esc(r.id)+'" aria-label="Подробнее: '+esc(r.title)+'">↗</button>');
 }
 return t.innerHTML;
};
const heroVisual=visualById.get('sculpture');
if(heroVisual){const img=$('#hero-visual');img.src=heroVisual.src;img.width=heroVisual.width;img.height=heroVisual.height}
labState.color='#b6b0ff';
const motionPreference=matchMedia('(prefers-reduced-motion:reduce)');
const canHover=matchMedia('(hover:hover) and (pointer:fine)');
if(readLocal('mr.motion',true)===false)document.documentElement.dataset.motion='off';
const motionAllowed=()=>!motionPreference.matches&&document.documentElement.dataset.motion!=='off';
let inputModality='pointer',previousView=null,uiAnimations=[];
document.addEventListener('keydown',()=>{inputModality='keyboard';document.documentElement.dataset.input='keyboard'},{capture:true,passive:true});
document.addEventListener('pointerdown',()=>{inputModality='pointer';document.documentElement.dataset.input='pointer'},{capture:true,passive:true});
function syncMotionButton(){const b=$('#motion-toggle');b.textContent=motionAllowed()?'Движение: вкл.':'Движение: выкл.';b.setAttribute('aria-pressed',String(motionAllowed()));b.title=motionPreference.matches?'Уменьшение движения включено в системе':'Настройка анимации только для этого браузера'}
function cancelUIAnimation(){uiAnimations.forEach(a=>a.cancel());uiAnimations=[]}
function enterElement(el,{delay=0,duration=420,distance=14,blur=0}={}){
 if(!el||!motionAllowed()||inputModality==='keyboard'||!el.animate)return;
 const frames=[{opacity:0,transform:'translateY('+distance+'px)',...(blur?{filter:'blur('+blur+'px)'}:{})},{opacity:1,transform:'translateY(0)',...(blur?{filter:'blur(0px)'}:{})}];
 const a=el.animate(frames,{duration,delay,easing:'cubic-bezier(.22,1,.36,1)',fill:'backwards'});uiAnimations.push(a);a.finished.then(()=>{uiAnimations=uiAnimations.filter(x=>x!==a)}).catch(()=>{});
}
const presentation={
 feed:{kicker:'Независимая библиотека / motion & code',title:'Идеи.<br>Код.<br><span>Движение.</span>',description:'Всё, что превращает «а что, если»<br>в твой следующий проект.'},
 code:{kicker:'01 / CODE & AGENT SKILLS',title:'Код, который <span>двигает.</span>',description:'От motion-принципов до рабочего инструмента. Skills, библиотеки и скрипты — с понятным происхождением.'},
 references:{kicker:'02 / INSPIRATION ARCHIVE',title:'Смотри глубже.<br><span>Делай своё.</span>',description:'Коллекция для внимательного взгляда: композиция, материал, ритм и механика движения.'},
 lab:{kicker:'03 / MOTION PLAYGROUND',title:'Из «а что, если» —<br><span>в движение.</span>',description:'Текст. Темп. Акцент. Попробуй идею здесь и забери редактируемый исходный код.'},
 knowledge:{kicker:'04 / YOUR CREATIVE CONTEXT',title:'Не просто промпт.<br><span>Твоя база.</span>',description:'Статьи, требования и наблюдения, которые помогают coding-агенту понять твою задачу.'},
 free:{kicker:'05 / OPEN RESOURCES',title:'Открыто для<br><span>твоих идей.</span>',description:'Бесплатные инструменты и ассеты. У каждого — свои условия использования, не одна лицензия на всё.'},
 offers:{kicker:'06 / DROPS & TRIALS',title:'Хорошие находки.<br><span>Честные условия.</span>',description:'Без выдуманных акций и вечных таймеров. Сначала источник и условия, потом — в работу.'},
 saved:{kicker:'07 / YOUR COLLECTION',title:'Хорошие идеи<br><span>не теряются.</span>',description:'Твоя личная коллекция. Без аккаунта, только в этом браузере. Экспортируй её для резервной копии.'}
};
const visualRender=render;
render=function(){
 const viewChanged=previousView!==state.tab,first=previousView===null;
 document.body.dataset.view=state.tab;
 visualRender();
 $('#repos-stat').textContent=catalog().length+discoveries().length;
 const p=presentation[state.tab]||presentation.feed;
 if(viewChanged){$('#hero-title').innerHTML=p.title;$('#hero-eyebrow').textContent=p.kicker;$('#hero-description').innerHTML=p.description}
 const headings={feed:'Свежие сигналы',code:codeMode==='discovery'?'Новые находки GitHub':'Подборка репозиториев',references:'Карта вдохновения',lab:'Твоя motion-песочница',knowledge:'Личные материалы',free:'Инструменты и ассеты',offers:'Предложения из источников',saved:'Твоя коллекция'};
 $('#section-title').textContent=headings[state.tab];
 if(state.tab==='feed')$('#section-intro').textContent='Материалы из открытых источников. Сохраняй, изучай оригинал и забирай нужное в работу.';
 if(state.tab==='references')$('#section-intro').textContent='Обложки ниже — иллюстрации, не скриншоты проектов. Изучаем приёмы и открываем оригиналы, не копируем чужие ассеты.';
 if(state.tab==='knowledge'){
  $('#hub-extra').insertAdjacentHTML('beforeend','<article class="knowledge-feature"><div><span class="mono">ВСТРОЕННЫЙ МАТЕРИАЛ / DESIGN FIELD NOTES</span><h3>От референса<br>к собственной системе.</h3><p>OriginKit, Chen Media, Three.js Journey и твои визуальные примеры: большая выжимка с решениями для этого сайта.</p></div><button class="btn" data-action="design-research">Читать разбор ↗</button></article>');
 }
 if(viewChanged&&!first){cancelUIAnimation();enterElement($('#content'),{duration:360,distance:12,blur:2});enterElement($('.hero-copy'),{duration:420,distance:10})}
 if(first&&state.tab==='feed'){
  enterElement($('.hero-copy'),{duration:650,distance:18,blur:3});
  enterElement($('.hero-art'),{duration:850,delay:80,distance:12});
 }
 $$('.version').forEach(el=>el.classList.toggle('version-long',el.textContent.length>14));
 previousView=state.tab;syncMotionButton();
};
const motionDetailModal=detailModal;
detailModal=function(id){
 motionDetailModal(id);const r=allRecords().find(x=>x.id===id);if(!r||!modal.open)return;
 const body=$('#modal .dialog-body');if(!body||body.querySelector('.modal-material-art'))return;
 const img=r.thumbnail&&safeUrl(r.thumbnail)?'<img src="'+esc(safeUrl(r.thumbnail))+'" alt="" loading="lazy" referrerpolicy="no-referrer">':visualImage(visualFor(r));
 body.insertAdjacentHTML('afterbegin','<div class="modal-material-art" aria-hidden="true">'+img+'<span>'+esc(r.kind==='repository'?r.type_label||'MOTION TOOLKIT':r.source_name||'CREATIVE SIGNAL')+'</span></div>');
};
const motionOpenModal=openModal;
let modalExitAnimation=null;
const instantModalClose=modal.close.bind(modal);
openModal=function(title,subtitle,body){if(modalExitAnimation){modalExitAnimation.cancel();modalExitAnimation=null}motionOpenModal(title,subtitle,body);modal.scrollTop=0;enterElement(modal,{duration:320,distance:14,blur:2})};
modal.close=function(value){
 if(!modal.open)return;
 if(modalExitAnimation){modalExitAnimation.cancel();modalExitAnimation=null}
 if(!motionAllowed()||inputModality==='keyboard'||!modal.animate){instantModalClose(value);return}
 const a=modal.animate([{opacity:1,transform:'translateY(0)'},{opacity:0,transform:'translateY(6px)'}],{duration:170,easing:'cubic-bezier(.3,0,.9,.7)'});
 modalExitAnimation=a;a.finished.then(()=>{if(modalExitAnimation===a){modalExitAnimation=null;instantModalClose(value)}}).catch(()=>{});
};
modal.addEventListener('cancel',e=>{e.preventDefault();inputModality='keyboard';modal.close()});
const alignedSetTab=setTab;
setTab=function(t){
 if(!presentation[t])return;const old=state.tab;
 const oldMain=$('#main').getBoundingClientRect().top;
 const wasScrolled=window.scrollY>120;
 alignedSetTab(t);
 if(old!==t&&wasScrolled){
  const delta=$('#main').getBoundingClientRect().top-oldMain;
  if(Math.abs(delta)>1)window.scrollBy({top:delta,behavior:'instant'});
 }
 if(inputModality==='keyboard')cancelUIAnimation();
};
window.addEventListener('popstate',()=>{const t=new URLSearchParams(location.search).get('view')||'feed';if(presentation[t]){state.tab=t;reset()}});
const hero=$('.hero');
hero.addEventListener('pointermove',e=>{
 if(!motionAllowed()||!canHover.matches||state.tab!=='feed')return;
 const r=hero.getBoundingClientRect(),x=(e.clientX-r.left)/r.width-.5,y=(e.clientY-r.top)/r.height-.5;
 hero.style.setProperty('--art-x',(x*12).toFixed(2)+'px');hero.style.setProperty('--art-y',(y*10).toFixed(2)+'px');hero.style.setProperty('--art-r',(x*1.5).toFixed(2)+'deg');
},{passive:true});
hero.addEventListener('pointerleave',()=>{['--art-x','--art-y','--art-r'].forEach(p=>hero.style.removeProperty(p))},{passive:true});
motionPreference.addEventListener('change',()=>{cancelUIAnimation();labAnimations.forEach(a=>a.cancel());if(state.tab==='lab')refreshScene();syncMotionButton()});
function showDesignResearch(){
 openModal('Design field notes','OriginKit × Chen Media × Three.js Journey + визуальные референсы пользователя.',
  '<div class="callout blue">Самостоятельный разбор открытых страниц и присланных визуалов. Не копия платных компонентов или закрытых инструкций. С источниками, ограничениями и решениями для Motion Radar.</div>'+
  '<div class="design-actions"><button class="btn primary" data-action="design-download">Скачать выжимку .md</button><button class="btn" data-action="design-save">В личные материалы</button></div>'+
  '<div class="design-excerpt" tabindex="0">'+esc(designResearch)+'</div>');
}
function showVisualCredits(){
 openModal('Дизайн, инструменты и изображения','Собственный интерфейс. Прозрачное происхождение материалов.',
 '<div class="credits-grid"><div class="credits-item"><strong>От насмотренности — к своей системе</strong><p>Галерейная подача OriginKit, библиотечная ясность Chen Media, сценический подход Three.js Journey и присланные тобой 3D/editorial-референсы. Собственная композиция и код; чужие компоненты и ассеты не перенесены.</p><button class="textbtn" data-action="design-research">Читать большой разбор ↗</button></div>'+
 '<div class="credits-item"><strong>Motion без лишнего веса</strong><p>CSS + Web Animations API: короткая обратная связь, мягкая смена раздела, раскрытие материала и три редактируемые сцены. Без тяжёлого runtime и платного API. Системное уменьшение движения и ручное выключение поддерживаются.</p><p>Для разработки локально добавлены два MIT-навыка: Motion Design от LottieFiles и Design Motion Principles от kylezantos/design-motion-principles. Это Markdown-справочники; сторонние установщики, хуки и чужой исполняемый код не запускались.</p><a href="https://github.com/LottieFiles/motion-design-skill" target="_blank" rel="noopener noreferrer">Motion Design ↗</a><a href="https://github.com/kylezantos/design-motion-principles" target="_blank" rel="noopener noreferrer">Design Motion Principles ↗</a></div>'+
 '<div class="credits-item"><strong>Original material studies · AI</strong><p>Ultraviolet / 001, лавандовая ткань и рифлёное стекло — оригинальные AI-иллюстрации для Motion Radar. Не реальные товары и не скриншоты репозиториев. На опубликованном сайте нет API генерации и списаний за изображения.</p></div>'+
 '<div class="credits-item"><strong>Световая живопись · фотография</strong><p>Alejandro De Roa / Pexels. Кадрирование и уменьшение по Pexels License. Фото не переобозначается как MIT или CC0.</p><a href="https://www.pexels.com/photo/spectacular-steel-wool-light-painting-in-tunnel-37278353/" target="_blank" rel="noopener noreferrer">Оригинал ↗</a><a href="https://www.pexels.com/license/" target="_blank" rel="noopener noreferrer">Лицензия ↗</a></div>'+
 '<div class="credits-item"><strong>Обложка ≠ доказательство</strong><p>Изображения из RSS принадлежат авторам материалов. Иллюстрации не подтверждают качество, безопасность или лицензию проекта. Ссылки и условия проверяются отдельно. Личные тексты и закладки не публикуются.</p></div></div>');
}
document.addEventListener('click',e=>{
 const b=e.target.closest('[data-action],[data-jump]');if(!b)return;
 if(b.dataset.jump){setTab(b.dataset.jump);$('#main').scrollIntoView({block:'start',behavior:'auto'});return}
 switch(b.dataset.action){
  case 'hero-lab':setTab('lab');$('#main').scrollIntoView({block:'start',behavior:'auto'});break;
  case 'hero-code':setTab('code');$('#main').scrollIntoView({block:'start',behavior:'auto'});break;
  case 'hero-explore':$('#main').scrollIntoView({block:'start',behavior:motionAllowed()&&inputModality!=='keyboard'?'smooth':'auto'});break;
  case 'visual-credits':showVisualCredits();break;
  case 'design-research':showDesignResearch();break;
  case 'design-download':downloadText('motion-radar-design-research.md',designResearch,'text/markdown;charset=utf-8');toast('Разбор скачан. Источники и ограничения внутри.');break;
  case 'design-save':
   try{importKnowledge([{id:'mr-design-research-v4',title:'Design field notes · полный разбор референсов',text:designResearch,url:'https://github.com/xDeizs/motion-radar/blob/main/DESIGN_RESEARCH.md',updated_at:new Date().toISOString()}]);store('mr.knowledge',knowledge);modal.close();setTab('knowledge');toast('Разбор сохранён только в этом браузере. В модель ничего не отправлено.')}
   catch(err){toast(err.message||'Не удалось сохранить разбор.')}
   break;
 }
});
$('#motion-toggle').addEventListener('click',()=>{
 const off=document.documentElement.dataset.motion!=='off';
 if(off)document.documentElement.dataset.motion='off';else delete document.documentElement.dataset.motion;
 store('mr.motion',!off);cancelUIAnimation();labAnimations.forEach(a=>a.cancel());if(state.tab==='lab')refreshScene();syncMotionButton();
 toast(motionPreference.matches?'Системное уменьшение движения остаётся включённым.':off?'Движение выключено для этого браузера.':'Движение включено.');
});
