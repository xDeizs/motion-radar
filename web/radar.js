/* Motion Radar 6 · article insights, honest model provenance, and a daily research desk. */
let digestTopic='all';
const isAI=r=>r.analysis&&r.analysis.engine!=='extractive';
const topicList=r=>r.analysis?.topics||['Практика'];
const radarCandidates=candidates;
candidates=function(){
 if(state.tab!=='digest')return radarCandidates();
 let rows=data.items.filter(r=>r.kind==='article');
 if(digestTopic!=='all')rows=rows.filter(r=>topicList(r).includes(digestTopic));
 if(state.source!=='all')rows=rows.filter(r=>r.source_id===state.source);
 const q=state.q.toLocaleLowerCase().trim();
 if(q)rows=rows.filter(r=>[r.title,r.summary,r.analysis?.summary,...topicList(r)].join(' ').toLocaleLowerCase().includes(q));
 return [...rows].sort((a,b)=>state.sort==='title'?a.title.localeCompare(b.title):state.sort==='source'?a.source_name.localeCompare(b.source_name):(b.published_at||b.seen_at||'').localeCompare(a.published_at||a.seen_at||''));
};
const radarSummary=summaryFor;
summaryFor=function(r){return isAI(r)?r.analysis.summary:radarSummary(r)};
const radarCard=card;
card=function(r){
 const html=radarCard(r);
 if(!r.analysis||r.kind!=='article')return html;
 return html.replace('<div class="card-foot">','<div class="analysis-actions"><button class="textbtn" data-read="'+esc(r.id)+'">'+ico('book',18)+' '+(isAI(r)?'AI-разбор':'Краткий разбор')+'</button><span class="analysis-mode">'+(isAI(r)?'локальная модель':'RSS · без модели')+'</span></div><div class="card-foot">');
};
function analysisMarkup(r){
 const a=r.analysis||{};
 return '<div class="reader-provenance"><span class="tag">'+(isAI(r)?'AI · подбор фрагментов':'Выдержка из RSS')+'</span><span>'+esc(r.source_name)+' · '+esc(fmtDate(r.published_at))+'</span></div>'+
 '<p class="reader-summary">'+esc(a.summary||r.summary||r.title)+'</p>'+
 ((a.takeaways||[]).length?'<h3>Что стоит забрать</h3><ul class="reader-points">'+a.takeaways.map(x=>'<li>'+esc(x)+'</li>').join('')+'</ul>':'')+
 '<div class="tags">'+topicList(r).map(t=>'<span class="tag">'+esc(t)+'</span>').join('')+'</div>'+
 '<div class="callout reader-note">'+esc(a.note||'Полный материал доступен у автора.')+'</div>'+
 '<details class="reader-evidence"><summary>Происхождение разбора</summary><dl><dt>Входные данные</dt><dd>'+esc(a.input_kind==='public_html'?'Открытый HTML статьи':'Название и фрагмент RSS — не полный текст')+'</dd><dt>Движок</dt><dd>'+esc(a.model||'Выдержка и правила, без AI')+'</dd><dt>Дата разбора</dt><dd>'+esc(fmtDate(a.generated_at,true))+'</dd></dl></details>'+
 '<div class="reader-actions"><a class="btn primary" href="'+esc(safeUrl(r.url))+'" target="_blank" rel="noopener noreferrer">Читать у автора '+ico('arrow',18)+'</a><button class="btn" data-analysis-export="'+esc(r.id)+'">Скачать заметку</button><button class="btn" data-context="'+esc(r.id)+'">В работу</button></div>';
}
function readArticle(id){const r=allRecords().find(x=>x.id===id);if(r)openModal(r.title,'Разбор материала · оригинал остаётся у автора',analysisMarkup(r))}
function digestCard(r,i){
 return '<article class="digest-card" data-card="'+esc(r.id)+'"><div class="digest-index">'+String(i+1).padStart(2,'0')+'</div><div class="digest-body"><div class="card-meta"><span>'+esc(r.source_name)+'</span><span>'+esc(fmtDate(r.published_at))+'</span><span class="analysis-mode">'+(isAI(r)?'AI-разбор':'RSS-выдержка')+'</span></div><h3><button class="digest-title" data-read="'+esc(r.id)+'">'+esc(r.title)+'</button></h3><p>'+esc(r.analysis?.summary||r.summary)+'</p><div class="tags">'+topicList(r).map(t=>'<span class="tag">'+esc(t)+'</span>').join('')+'</div><div class="digest-actions"><button class="textbtn" data-read="'+esc(r.id)+'">Открыть разбор '+ico('arrow',16)+'</button><a class="textbtn" href="'+esc(safeUrl(r.url))+'" target="_blank" rel="noopener noreferrer">Оригинал</a></div></div>'+saveButton(r,'digest-save')+'</article>';
}
const radarRender=render;
render=function(){
 radarRender();
 const articles=data.items.filter(r=>r.kind==='article'),ai=articles.filter(isAI).length,healthy=data.sources.filter(s=>s.status==='ok').length;
 $('#pipeline-strip').innerHTML='<div><strong>'+healthy+'/'+data.sources.length+'</strong><span>лент прочитано</span></div><div><strong>'+articles.length+'</strong><span>статей в снимке</span></div><div><strong>'+catalog().length+'</strong><span>инструментов / skills</span></div><div><strong>'+ai+'</strong><span>локальных AI-разборов</span></div>';
 $('#count-digest').textContent=articles.length;
 const nav=$('.tabs'),selected=nav.querySelector('[aria-selected="true"]');
 if(selected){const n=nav.getBoundingClientRect(),t=selected.getBoundingClientRect();if(t.left<n.left||t.right>n.right)nav.scrollLeft+=t.left-n.left-(n.width-t.width)/2;}

 if(state.tab==='digest'){
  const rows=candidates();$('#section-title').textContent='Не просто сохранить. Разобраться.';
  $('#section-intro').textContent='Свежие статьи с кратким разбором, темами и прямой ссылкой на источник. AI-отбор помечен только там, где действительно отработала локальная модель; остальные материалы честно помечены RSS.';
  $('#result-count').textContent=rows.length+' '+materialWord(rows.length);
  $('#category-chips').hidden=true;$('.filters').hidden=false;$('.load-wrap').hidden=false;
  $('#cards').className='digest-grid';
  $('#cards').innerHTML=rows.length?rows.slice(0,state.limit).map(digestCard).join(''):'<div class="empty"><h3>Пока без совпадений</h3><p>Сбрось тему, источник или поисковый запрос.</p><button class="btn" data-digest-reset>Сбросить всё</button></div>';
  const topics=[...new Set(articles.flatMap(topicList))];
  $('#hub-extra').innerHTML='<div class="digest-toolbar"><div class="chips"><button class="chip" data-digest-topic="all" aria-pressed="'+(digestTopic==='all')+'">Все темы</button>'+topics.map(t=>'<button class="chip" data-digest-topic="'+esc(t)+'" aria-pressed="'+(digestTopic===t)+'">'+esc(t)+'</button>').join('')+'</div><button class="btn" data-digest-export>'+ico('book',18)+' Скачать обзор</button></div>';
  $('#load-more').hidden=rows.length<=state.limit;$('#load-more').textContent='Показать ещё '+Math.min(12,Math.max(0,rows.length-state.limit));
 }
};
function markdownArticle(r){
 const a=r.analysis||{};
 return '## '+r.title+'\n\nИсточник: '+r.url+'\n\n'+(a.summary||r.summary||'')+'\n\n'+(a.takeaways||[]).map(x=>'- '+x).join('\n')+'\n\nТемы: '+topicList(r).join(', ')+'\nДвижок: '+(a.model||'RSS, без AI')+'\n'+(a.note||'')+'\n';
}
document.addEventListener('click',e=>{
 const b=e.target.closest('button');if(!b)return;
 if(b.dataset.read){readArticle(b.dataset.read);return}
 if(b.hasAttribute('data-digest-topic')){digestTopic=b.dataset.digestTopic;state.limit=12;render();return}
 if(b.hasAttribute('data-digest-reset')){digestTopic='all';reset();return}
 if(b.dataset.analysisExport){const r=allRecords().find(x=>x.id===b.dataset.analysisExport);if(r)downloadText('motion-radar-note.md',markdownArticle(r));return}
 if(b.hasAttribute('data-digest-export')){downloadText('motion-radar-digest.md','# Motion Radar · обзор\n\nСнимок: '+data.meta.generated_at+'\n\n'+candidates().slice(0,20).map(markdownArticle).join('\n---\n\n'));return}
});
window.addEventListener('popstate',()=>{
 const v=new URLSearchParams(location.search).get('view');
 state.tab=['feed','digest','topics','guides','code','references','lab','knowledge','free','offers','saved'].includes(v)?v:'feed';digestTopic='all';reset();
});
document.addEventListener('keydown',e=>{if(e.key==='/'&&!e.ctrlKey&&!e.metaKey&&!['INPUT','TEXTAREA','SELECT'].includes(document.activeElement.tagName)&&!modal.open){e.preventDefault();$('#search').focus()}});
// Deep links must settle after fonts and the existing experience initialize.
window.addEventListener('load',()=>{if(location.hash==='#main'||(params.has('view')&&state.tab!=='feed'))setTimeout(()=>$('#main').scrollIntoView({block:'start',behavior:'instant'}),120)},{once:true});
