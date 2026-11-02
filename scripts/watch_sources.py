#!/usr/bin/env python3
"""Bounded public metadata watcher. Never fetches post bodies, captions or code.
No social scraping, model calls, installation, credentials or automatic execution.
"""
from __future__ import annotations
import argparse, datetime as dt, hashlib, json, os, re
from pathlib import Path
from urllib import request, parse, error
import xml.etree.ElementTree as ET
import update
ROOT=Path(__file__).resolve().parents[1]
HOSTS={'api.github.com','www.youtube.com','louisedesadeleer.substack.com'}
CAP=2*1024*1024
ATOM='{http://www.w3.org/2005/Atom}'
YT='{http://www.youtube.com/xml/schemas/2015}'
PLATFORMS={'github','youtube','rss'}

def stamp():return dt.datetime.now(dt.timezone.utc).isoformat(timespec='seconds').replace('+00:00','Z')
def load(path,default):
 try:return json.loads(Path(path).read_text('utf-8'))
 except (ValueError,OSError):return default

def short(value,n=250):
 text=update.plain(str(value or ''))
 text=re.sub(r'(?:AIza[\w-]{20,}|gh[pousr]_[\w]{15,}|github_pat_[\w]{15,}|sk-[\w-]{20,})','[скрыто]',text)
 return re.sub(r'\s+',' ',text).strip()[:n]

def url_for(s):
 p=s['platform']
 if p=='github':
  repo=s.get('repo','');mode=s.get('mode','releases')
  if not re.fullmatch(r'[A-Za-z0-9_-][A-Za-z0-9_.-]*/[A-Za-z0-9_-][A-Za-z0-9_.-]*',repo) or any(x in {'.','..'} for x in repo.split('/')):raise ValueError('repo')
  if mode not in {'releases','commits'}:raise ValueError('mode')
  return 'https://api.github.com/repos/'+repo+'/'+mode+'?per_page=5'
 if p=='youtube':
  ch=s.get('channel_id','')
  if not re.fullmatch(r'UC[A-Za-z0-9_-]{22}',ch):raise ValueError('channel')
  return 'https://www.youtube.com/feeds/videos.xml?channel_id='+ch
 if p=='rss':
  u=s.get('feed','')
  if u!='https://louisedesadeleer.substack.com/feed':raise ValueError('feed not reviewed')
  return u
 raise ValueError('unsupported adapter')

class NoRedirect(request.HTTPRedirectHandler):
 def redirect_request(self,*args,**kwargs):return None
class WatchError(Exception):
 def __init__(self,code='network',retry=21600):self.code=code;self.retry=retry
class Client:
 def __init__(self):self.open=request.build_opener(NoRedirect());self.calls=0;self.blocked=set()
 def fetch(self,url):
  u=parse.urlsplit(url)
  if u.scheme!='https' or u.hostname not in HOSTS or u.port not in (None,443) or u.username or u.password:raise ValueError('origin')
  update.validate_url(url)
  if u.hostname in self.blocked:raise WatchError('origin_paused')
  self.calls+=1
  try:
   req=request.Request(url,headers={'User-Agent':'MotionRadar/8.0 (public metadata watcher)','Accept-Encoding':'identity','Accept':'application/atom+xml,application/rss+xml,application/vnd.github+json'})
   with self.open.open(req,timeout=25) as r:
    raw=r.read(CAP+1)
    if len(raw)>CAP:raise WatchError('body_limit')
    return raw
  except error.HTTPError as e:
   retry=21600 if e.code in (401,403,429) else 1800
   try:retry=max(retry,min(86400,int(e.headers.get('Retry-After','0'))))
   except (ValueError,TypeError):pass
   if e.code in (401,403,429):self.blocked.add(u.hostname)
   raise WatchError('http_'+str(e.code),retry) from None
  except (error.URLError,TimeoutError,OSError):raise WatchError() from None

def allowed_link(url,platform):
 try:
  u=parse.urlsplit(url)
  host={'github':{'github.com'},'youtube':{'www.youtube.com','youtube.com'},'rss':{'louisedesadeleer.substack.com'}}[platform]
  if u.scheme!='https' or u.hostname not in host or u.username or u.password or u.port not in (None,443):return None
  return update.canonical(url)
 except (ValueError,TypeError,KeyError):return None

def normalize(s,raw,now):
 p=s['platform'];out=[]
 if p=='github':
  data=json.loads(raw)
  if not isinstance(data,list):raise ValueError('not a list')
  for r in data[:5]:
   if s.get('mode')=='commits':
    title=short(r.get('commit',{}).get('message','').split('\n')[0]);pub=r.get('commit',{}).get('committer',{}).get('date');body='Изменение открытого репозитория. Diff и код ещё не разобраны.'
   else:
    if r.get('draft'):continue
    title=short(r.get('name') or r.get('tag_name'));pub=r.get('published_at');body='Новый релиз открытого проекта. Release notes ещё не разобраны.'
   out.append((title,r.get('html_url'),pub,body))
 else:
  if b'<!DOCTYPE' in raw.upper() or b'<!ENTITY' in raw.upper():raise ValueError('DTD forbidden')
  doc=ET.fromstring(raw)
  if doc.tag not in {'rss',ATOM+'feed'}:raise ValueError('not a feed')
  entries=doc.findall(ATOM+'entry') if doc.tag==ATOM+'feed' else doc.findall('./channel/item')
  for e in entries[:30]:
   title=e.findtext(ATOM+'title') or e.findtext('title');pub=e.findtext(ATOM+'published') or e.findtext(ATOM+'updated') or e.findtext('pubDate')
   if p=='youtube':
    vid=e.findtext(YT+'videoId') or ''
    if not re.fullmatch(r'[A-Za-z0-9_-]{11}',vid):continue
    if e.findtext(YT+'channelId')!=s['channel_id']:continue
    link='https://www.youtube.com/watch?v='+vid;body='Новое видео канала. Описание, субтитры и видеоряд ещё не разобраны.'
   else:
    link=e.findtext('link') or next((x.get('href') for x in e.findall(ATOM+'link') if x.get('rel','alternate')=='alternate'),None)
    body='Новая статья автора. Полный текст ещё не разобран.'
   out.append((short(title),link,pub,body))
 result=[]
 for title,url,pub,summary in out:
  url=allowed_link(url,p)
  if not title or not url:continue
  if s.get('keywords') and not any(k.casefold() in title.casefold() for k in s['keywords']):continue
  published=update.iso(pub)
  if published and update.parse_date(published)>update.parse_date(now)+dt.timedelta(days=1):continue
  result.append(dict(id='signal-'+hashlib.sha256(url.encode()).hexdigest()[:18],title=title,url=url,summary=summary,source_name=short(s['label'],100),source_id='watch-'+s['id'],watch_id=s['id'],platform=p,kind='watch_signal',basis='metadata_only',published_at=published,seen_at=now,checked_at=now,tags=['Новый сигнал',p],link_status='ok',research_state='needs_review'))
 return result[:5]

def collect(config,previous,client,force=False,offline=False,now=None):
 now=now or stamp();instant=update.parse_date(now);items=[];health=[]
 prior=previous.get('items',[]);old_by_id={x['id']:x for x in prior if isinstance(x,dict) and 'id' in x};prior_states={x['id']:x for x in previous.get('sources',[]) if 'id' in x}
 for s in config.get('sources',[])[:16]:
  if not re.fullmatch(r'[a-z0-9-]{1,40}',s.get('id','')):continue
  h=dict(id=s['id'],label=short(s.get('label'),100),platform=s.get('platform'),enabled=bool(s.get('enabled')),status='disabled',count=0)
  cached=[r for r in prior if r.get('watch_id')==s['id'] and allowed_link(r.get('url'),s['platform'])]
  old=prior_states.get(s['id'],{});sig=hashlib.sha256(json.dumps(s,sort_keys=True).encode()).hexdigest()[:12]
  h['config_signature']=sig
  if not s.get('enabled'):
   h['reason']=short(s.get('reason','Не подключён'),400);health.append(h);continue
  try:url=url_for(s)
  except (ValueError,KeyError):h.update(status='config_error',reason='Конфигурация не прошла проверку');health.append(h);continue
  next_at=update.parse_date(old.get('next_check'))
  if offline or (not force and next_at and instant<next_at and old.get('config_signature')==sig):
   h.update({k:old[k] for k in ['last_attempt','last_success','next_check','error'] if k in old});h['status']='offline' if offline else ('backoff' if old.get('status') in {'error','backoff'} else 'cached')
   h['count']=len(cached);items.extend([{**r,'source_stale':h['status'] in {'backoff','offline'}} for r in cached]);health.append(h);continue
  h['last_attempt']=now
  try:
   rows=normalize(s,client.fetch(url),now)
   for r in rows:
    if r['id'] in old_by_id:r['seen_at']=old_by_id[r['id']].get('seen_at',now)
   items.extend(rows);h.update(status='ok',count=len(rows),last_success=now,next_check=(instant+dt.timedelta(minutes=max(30,int(config.get('poll_minutes',30))))).isoformat())
  except (WatchError,ValueError,TypeError,KeyError,ET.ParseError):
   # Do not log response bodies, URL error text or provider data.
   import sys
   e=sys.exception();delay=e.retry if isinstance(e,WatchError) else 21600
   h.update(status='error',error=e.code if isinstance(e,WatchError) else 'invalid_response',count=len(cached),last_success=old.get('last_success'),next_check=(instant+dt.timedelta(seconds=delay)).isoformat())
   items.extend([{**r,'source_stale':True} for r in cached])
  health.append(h)
 unique={r['url']:r for r in items};rows=sorted(unique.values(),key=lambda r:r.get('published_at') or r['seen_at'],reverse=True)[:120]
 return dict(schema_version=1,generated_at=now,mode='public_metadata_only',schedule_minutes=30,sources=health,items=rows,network_calls=client.calls)

def main():
 p=argparse.ArgumentParser(description=__doc__);p.add_argument('--force',action='store_true');p.add_argument('--offline',action='store_true');p.add_argument('--no-render',action='store_true');a=p.parse_args()
 output=collect(load(ROOT/'config/watchlist.json',{}),load(ROOT/'data/signals.json',{}),Client(),a.force,a.offline)
 path=ROOT/'data/signals.json';tmp=path.with_suffix('.tmp');tmp.write_text(json.dumps(output,ensure_ascii=False,indent=2)+'\n','utf-8');os.replace(tmp,path)
 if not a.no_render:update.write_site(load(ROOT/'data/feed.json',{}))
 print('Signals:',len(output['items']),'network calls:',output['network_calls'])
 for s in output['sources']:print(s['id'],s['status'],s['count'],s.get('error',''))
 return 0
if __name__=='__main__':raise SystemExit(main())
