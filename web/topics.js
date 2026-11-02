/* Topic desk: static snapshots, honest collection status, no client-side secrets. */
const presets=()=>data.topics?.topics||[];
const guideRows=()=>data.guides||[];
let selectedTopic=presets().some(t=>t.id===params.get('topic'))?params.get('topic'):(presets()[0]?.id||'');
let topicQuery=presets().find(t=>t.id===selectedTopic)?.query||'Remotion animation';
const topicSnapshot=()=>data.topic_research?.topics?.find(t=>t.id===selectedTopic);
const topicPreviousAll=allRecords;
allRecords=function(){return [...new Map([...topicPreviousAll(),...guideRows(),...(data.access||[]),...(data.community||[]),...(data.topic_research?.topics||[]).flatMap(t=>t.items||[])].map(r=>[r.id,r])).values()]};
const topicPreviousCandidates=candidates;
candidates=function(){
 if(state.tab==='topics')return [];
 if(state.tab!=='guides')return topicPreviousCandidates();
 const q=state.q.toLocaleLowerCase().trim();
 return guideRows().filter(r=>!q||[r.title,r.summary,r.access,...r.steps].join(' ').toLocaleLowerCase().includes(q));
};
const topicPreviousCard=card;
card=function(r){
 if(r.kind!=='guide')return topicPreviousCard(r);
 return '<article class="guide-card"><div class="guide-meta"><span>ГАЙД · ПЕРВОИСТОЧНИКИ</span>'+saveButton(r)+'</div><h3>'+esc(r.title)+'</h3><p>'+esc(r.summary)+'</p><div class="guide-access">'+esc(r.access)+'</div><button class="btn" data-guide="'+esc(r.id)+'">Открыть шаги '+ico('arrow',16)+'</button></article>';
};
const topicPreviousStatus=offerStatus;
offerStatus=function(r){return r.offer_status==='official_terms'?{cls:'warn',text:'Официальные условия · проверь право на доступ'}:topicPreviousStatus(r)};
const topicPreviousDetail=detailModal;
detailModal=function(id){
 const r=allRecords().find(r=>r.id===id);
 if(r?.kind==='guide'){showGuide(id);return}
 if(r?.kind==='access'){
  openModal(r.title,'Условия источника — не проверка твоего аккаунта','<p>'+esc(r.summary)+'</p><div class="callout">'+esc(r.scope)+'</div><p>Справка прочитана: '+esc(fmtDate(r.checked_at,true))+'. Это не акция с подтверждённой датой окончания и не обещание бесплатности всех возможностей.</p><a class="btn primary" href="'+esc(safeUrl(r.url))+'" target="_blank" rel="noopener noreferrer">Проверить условия</a>');return;
 }
 topicPreviousDetail(id);
};
function guideMarkdown(r){return '# '+r.title+'\n\n'+r.summary+'\n\n'+r.steps.map((s,i)=>(i+1)+'. '+s).join('\n\n')+'\n\n## Стартовый промпт\n\n'+r.prompt+'\n\n## Доступ и ограничения\n\n'+r.access+'\n\n## Источники\n\n'+[r.url,...(r.links||[]).map(l=>l.url)].join('\n')+'\n\nСправка прочитана: '+r.checked_at+'; сценарий редакторский, не проверка твоего аккаунта.\n'}
function showGuide(id){
 const r=guideRows().find(r=>r.id===id);if(!r)return;
 openModal(r.title,'Редакторский сценарий на основе документации · '+r.checked_at,
 '<p class="reader-summary">'+esc(r.summary)+'</p><ol class="guide-steps">'+r.steps.map(s=>'<li>'+esc(s)+'</li>').join('')+'</ol><h3>Стартовый промпт</h3><p class="guide-prompt">'+esc(r.prompt)+'</p><div class="callout">'+esc(r.access)+'</div><div class="reader-actions"><button class="btn primary" data-guide-copy="'+esc(r.id)+'">Скопировать промпт</button><button class="btn" data-guide-export="'+esc(r.id)+'">Скачать гайд</button></div><h3>Первоисточники</h3><ul class="guide-sources">'+[{title:'Основная документация',url:r.url},...(r.links||[])].map(l=>'<li><a href="'+esc(safeUrl(l.url))+'" target="_blank" rel="noopener noreferrer">'+esc(l.title)+' '+ico('arrow',14)+'</a></li>').join('')+'</ul>');
}
const healthLabel={ok:'прочитан',partial:'частичный ответ',cached:'кэш < 6 часов',offline:'офлайн-снимок',not_requested:'не запускался',needs_key:'нужен свой токен',needs_consent:'нужно разрешить расходы',needs_approval:'нужно одобрение Reddit',error:'ошибка / ограничение',private_review:'приватная проверка',budget_limit:'лимит вызовов',empty:'нет данных'};
function topicResult(r){return '<article class="topic-result"><div><div class="card-meta"><span>'+esc(r.platform||r.source_name)+'</span><span>'+(r.kind==='community'?'поисковый фрагмент':r.kind==='topic_rss'?'RSS-фрагмент':'метаданные · не аудит')+(r.stale?' · старый снимок':'')+(r.ai_selected?' · AI-отбор':'')+'</span></div><h3><a href="'+esc(safeUrl(r.url))+'" target="_blank" rel="noopener noreferrer">'+esc(r.title)+'</a></h3><p>'+esc(r.summary)+'</p></div>'+saveButton(r)+'</article>'}
function renderTopics(){
 const snapshot=topicSnapshot(),query=topicQuery,q=encodeURIComponent(query);
 const rows=snapshot?.items||[];
 const community=(data.community||[]).filter(r=>r.topic_id===selectedTopic);
 const links=[['Google','https://www.google.com/search?q='+q],['GitHub','https://github.com/search?type=repositories&q='+q],['Reddit','https://www.reddit.com/search/?q='+q],['X','https://x.com/search?f=live&q='+q]];
 $('#cards').className='topic-desk';$('#result-count').textContent=rows.length+' в снимке';
 $('#cards').innerHTML='<section class="topic-control" aria-labelledby="topic-heading"><div class="topic-kicker">RESEARCH DESK / 01</div><h3 id="topic-heading">Выбери, за чем следить.</h3><p>Сначала снимок, затем первоисточник. Без обещания «весь интернет».</p><div class="topic-presets">'+presets().map(t=>'<button class="chip" data-topic-preset="'+esc(t.id)+'" aria-pressed="'+(t.id===selectedTopic)+'">'+esc(t.title)+'</button>').join('')+'</div><form id="topic-form"><label for="topic-query">Ключевые слова темы</label><div class="topic-input"><input id="topic-query" name="topic" value="'+esc(query)+'" maxlength="140" required autocomplete="off"><button class="btn primary" type="submit">Показать снимок</button></div><p id="topic-error" class="form-error" role="alert" hidden></p></form><div class="topic-search-links">'+links.map(([n,u])=>'<a class="btn" href="'+esc(u)+'" target="_blank" rel="noopener noreferrer">Искать в '+n+' '+ico('arrow',14)+'</a>').join('')+'</div><p class="topic-disclaimer">Внешние кнопки — ручной поиск. На GitHub Pages нет сервера: этот экран не запускает парсинг и не запрашивает ключи.</p><div class="topic-plan-actions"><button class="btn" data-topic-plan>Скачать план сбора</button><button class="textbtn" data-topic-access>Подключения и квоты</button></div></section>'+
 '<section class="topic-status" aria-label="Состояние сборщиков"><h3>Что действительно прочитано</h3><p>GitHub: '+esc(snapshot?.checked_at?fmtDate(snapshot.checked_at,true):'нового сетевого снимка ещё нет')+'. RSS — из общей ленты.</p><dl>'+[['rss','RSS'],['github','GitHub'],['gemini','Gemini'],['x','X API'],['reddit','Reddit API']].map(([k,n])=>{const h=snapshot?.health?.[k]||{};return '<div><dt>'+n+'</dt><dd>'+esc(healthLabel[h.status]||'не подключён')+(h.count!==undefined?' · '+Number(h.count):'')+'</dd></div>'}).join('')+'</dl><p>Gemini только отбирает ID из публичных фрагментов. X/Reddit API выключены по умолчанию; результаты адаптеров остаются в приватной очереди, не в этой ленте.</p><a href="integrations/Motion-Radar.postman_collection.json" download class="textbtn">Скачать Postman-коллекцию '+ico('arrow',14)+'</a></section>'+
 '<section class="topic-findings"><div class="section-heading"><h3>Публичный снимок по теме</h3><span>'+rows.length+' результатов · первая страница GitHub</span></div>'+(rows.length?rows.map(r=>topicResult({...r,ai_selected:snapshot?.ai_selected_ids?.includes(r.id)})).join(''):'<div class="empty"><h3>Снимок ещё не собран</h3><p>Скачай план и запусти сборщик на своём компьютере или в Actions. Обычный веб-поиск доступен выше.</p></div>')+'</section>'+
 (community.length?'<section class="topic-findings"><div class="section-heading"><h3>Обсуждения из X и Reddit</h3><span>Редакторская подборка · не поток API</span></div><div class="callout">Найдены публичным веб-поиском. Прочитаны только поисковые фрагменты; видео, комментарии и код не проверены.</div>'+community.map(topicResult).join('')+'</section>':'');
}
const topicPreviousRender=render;
render=function(){
 topicPreviousRender();
 $('#items-stat').textContent=allRecords().length;$('#items-label').textContent=materialWord(allRecords().length);
 $('#count-topics').textContent=presets().length;$('#count-guides').textContent=guideRows().length;
 if(state.tab==='guides'){
  $('#section-title').textContent='От идеи до первого рендера.';
  $('#section-intro').textContent='Claude Motion, Claude Code + Remotion, Grok Imagine и Grok Bot — разные пути. В каждом гайде есть шаги, стартовый промпт, источник и ограничения доступа.';
  $('#cards').className='guide-grid';$('.filters').hidden=false;$('#source-filter').closest('label')?.setAttribute('hidden','');
  $('#hub-extra').innerHTML='<div class="callout">Гайды составлены по документации, а не выполнены в твоих аккаунтах. Условия сервисов могут измениться. Не запускай команды и сторонний код без проверки.</div>';
 }else $('#source-filter').closest('label')?.removeAttribute('hidden');
 if(state.tab==='topics'){
  $('#section-title').textContent='Интернет большой. Тема — твоя.';
  $('#section-intro').textContent='Настраиваемый сбор публичных RSS и репозиториев. X/Reddit — ручной поиск или отдельный одобренный API. Секреты никогда не попадают в браузер.';
  $('.filters').hidden=true;$('.load-wrap').hidden=true;renderTopics();
 }
 if(state.tab==='offers')$('#hub-extra').innerHTML='<div class="callout">Только официальные условия бесплатного доступа и триалов. Это не найденные API-ключи и не обходы квот. Твой аккаунт и остаток кредитов здесь не проверялись.</div>';
};
function topicPlan(){return '# Motion Radar · план тематического сбора\n\nТема: '+topicQuery+'\n\n## Публичный запуск\n\n```bash\npython3 scripts/collect_topics.py --topic "'+topicQuery+'" --providers github\n```\n\nПо умолчанию: только публичный GitHub и RSS из снимка. Первая страница, не весь интернет.\n\nGitHub Actions: Update and publish Motion Radar → Run workflow → поле topic. Публикация требует своего подтверждённого репозитория.\n\n## Дополнительные API\n\nСм. docs/API_SETUP.md. Секреты — только локальные переменные окружения или GitHub Actions Secrets. Никогда не HTML/JSON/коммит.\nGemini и X требуют --allow-metered; Reddit — --approved-reddit и одобренный use case.\nСоциальные результаты остаются в .private/topic-review.json. Их нельзя публиковать автоматически.\n\nPostman: integrations/Motion-Radar.postman_collection.json. Ключи пустые. Не запускайте всю коллекцию без проверки биллинга.\n'}
document.addEventListener('submit',e=>{
 if(e.target.id!=='topic-form')return;e.preventDefault();
 const q=$('#topic-query').value.trim();
 if(q.length<2||q.length>140||!/^[-\p{L}\p{N}_ +.,()]+$/u.test(q)||/(AIza|gh[pousr]_|github_pat_|sk-)[\w-]{15,}/.test(q)){$('#topic-error').hidden=false;$('#topic-error').textContent='Нужны обычные ключевые слова (2–140 символов), без URL и секретов.';return}
 topicQuery=q;const known=presets().find(t=>t.query.toLocaleLowerCase()===q.toLocaleLowerCase());
 const old=(data.topic_research?.topics||[]).find(t=>t.query.toLocaleLowerCase()===q.toLocaleLowerCase());
 selectedTopic=known?.id||old?.id||'';render();
});
document.addEventListener('click',async e=>{
 const b=e.target.closest('button');if(!b)return;
 if(b.dataset.topicPreset){selectedTopic=b.dataset.topicPreset;topicQuery=presets().find(t=>t.id===selectedTopic)?.query||'';render();return}
 if(b.dataset.guide){showGuide(b.dataset.guide);return}
 if(b.dataset.guideExport){const r=guideRows().find(r=>r.id===b.dataset.guideExport);if(r)downloadText(r.id+'.md',guideMarkdown(r));return}
 if(b.dataset.guideCopy){const r=guideRows().find(r=>r.id===b.dataset.guideCopy);if(r)try{await navigator.clipboard.writeText(r.prompt);toast('Промпт скопирован.')}catch{toast('Буфер недоступен — скачай гайд или выдели текст.')}return}
 if(b.hasAttribute('data-topic-plan')){downloadText('motion-radar-topic-plan.md',topicPlan());return}
 if(b.hasAttribute('data-topic-access')){
  openModal('Собственные подключения, не «общие ключи»','Ни один токен не хранится в этом сайте.','<ul class="guide-steps"><li>RSS и GitHub: публичный сбор по ключевым словам, с лимитами и кэшем.</li><li>Gemini: собственный ключ, проверка квот и отдельное разрешение возможных расходов. Не даёт доступа к X/Reddit.</li><li>X: собственный Bearer token, платное чтение может списывать кредиты. Отдельная приватная очередь.</li><li>Reddit: нужен одобренный use case и OAuth. Токен сам по себе не означает разрешения публикации.</li><li>Postman Enterprise — клиент и управление API. Его ключ не оплачивает внешние API.</li><li>Notion Business / триал — отдельные права и квоты. Повторные аккаунты не используются для обхода ограничений.</li></ul><a class="btn" href="docs/API_SETUP.md" target="_blank" rel="noopener noreferrer">Инструкция подключения '+ico('arrow',16)+'</a>');return;
 }
});
