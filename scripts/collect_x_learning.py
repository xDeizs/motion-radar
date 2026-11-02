#!/usr/bin/env python3
"""Owned X recent keyword search. OFF without key AND --allow-metered.
No public post text, automatic article-reading, model calls or tool execution.
Window: last 7 days; bounded pages, resumable pagination and per-query watermarks.
"""
import argparse, datetime as dt, hashlib, json, os, re, sys
from pathlib import Path
from urllib import request, parse, error
from email.utils import parsedate_to_datetime
import update
from watch_sources import NoRedirect, stamp, load
ROOT=Path(__file__).resolve().parents[1]
ENDPOINT='https://api.x.com/2/tweets/search/recent'
CAP=2*1024*1024
class APIError(Exception):
 def __init__(self,code,delay=21600):self.code=code;self.delay=delay
class Client:
 def __init__(self,token):self.token=token;self.calls=0;self.open=request.build_opener(NoRedirect());self.stopped=False
 def fetch(self,params):
  if self.stopped:raise APIError('origin_paused')
  update.validate_url(ENDPOINT);self.calls+=1
  try:
   req=request.Request(ENDPOINT+'?'+parse.urlencode(params),headers={'Authorization':'Bearer '+self.token,'User-Agent':'MotionRadar/9.0','Accept':'application/json','Accept-Encoding':'identity'})
   with self.open.open(req,timeout=25) as r:
    raw=r.read(CAP+1)
    if len(raw)>CAP:raise APIError('body_limit')
    return json.loads(raw)
  except error.HTTPError as e:
   delay=21600 if e.code in (401,402,403,429) else 1800
   retry=e.headers.get('Retry-After','')
   try:delay=max(delay,min(86400,int(retry)))
   except ValueError:
    try:delay=max(delay,min(86400,int((parsedate_to_datetime(retry)-dt.datetime.now(dt.timezone.utc)).total_seconds())))
    except (ValueError,TypeError,OverflowError):pass
   if e.code in (401,402,403,429):self.stopped=True
   raise APIError('http_'+str(e.code),delay) from None
  except (error.URLError,OSError,TimeoutError):raise APIError('network') from None
  except (ValueError,UnicodeError):raise APIError('invalid_response') from None

def clean_keywords(value):
 v=value.strip()
 if not 2<=len(v)<=140 or not re.fullmatch(r'[\w +.,()\-]+',v,re.UNICODE) or re.search(r'(?:AIza|gh[pousr]_|github_pat_|sk-)[\w-]{15,}',v):raise ValueError('Use ordinary keywords, no URLs or secrets')
 return v

def select(config,preset='all',query=None):
 if query:
  q=clean_keywords(query);return [{'id':'custom-'+hashlib.sha256(q.casefold().encode()).hexdigest()[:12],'x_query':q}]
 rows=config.get('presets',[])[:10]
 if preset!='all':rows=[r for r in rows if r['id']==preset]
 if not rows:raise ValueError('Unknown preset')
 for r in rows:
  if not re.fullmatch(r'[a-z0-9-]{1,50}',r['id']) or not 2<=len(r['x_query'])<=500:raise ValueError('Invalid preset')
 return rows

def normalise(r,query_id,now):
 if not isinstance(r,dict) or not re.fullmatch(r'\d{1,30}',str(r.get('id',''))):return None
 n=r.get('note_post') or r.get('note_tweet') or {};n=n if isinstance(n,dict) else {};a=r.get('article');text=n.get('text') or r.get('text','')
 if not isinstance(text,str):return None
 # Raw social material is PRIVATE data, never an instruction. No returned URLs are fetched.
 article={k:a[k] for k in ('id','title') if isinstance(a,dict) and isinstance(a.get(k),str)}
 return {'id':str(r['id']),'url':'https://x.com/i/web/status/'+str(r['id']),'text':text[:30000],'article':article,'created_at':r.get('created_at'),'query_ids':[query_id],'observed_at':now,'coverage':'expanded_text' if n.get('text') else ('article_metadata_only' if a else 'standard_text_may_be_truncated'),'review_state':'needs_review','trust':'untrusted_source'}

def collect(rows,previous,client,allowed=False,has_key=False,max_requests=3,now=None):
 now=now or stamp();instant=update.parse_date(now);state=json.loads(json.dumps(previous));state.setdefault('queries',{});state.setdefault('items',[])
 public={'generated_at':now,'status':'needs_key' if not has_key else 'needs_consent','network_calls':0,'window_days':7,'public_post_bodies':False,'publication':'private_review_only','query_count':len(rows)}
 if not allowed or not has_key:return state,public
 next_at=update.parse_date(state.get('next_check'))
 if next_at and instant<next_at:
  public.update(status='backoff' if state.get('last_error') else 'cached',next_check=state['next_check'],queued=len(state['items']));return state,public
 limit=max(1,min(10,int(max_requests)));pending={str(r['id']):r for r in state['items'] if isinstance(r,dict) and re.fullmatch(r'\d{1,30}',str(r.get('id','')))}
 cursor=int(state.get('cursor',0))%len(rows);ordered=rows[cursor:]+rows[:cursor];done=0;fault=None
 for row in ordered:
  q=row['x_query']+' -is:retweet';signature=hashlib.sha256(q.encode()).hexdigest()[:16];qid=row['id']
  s=state['queries'].get(qid,{})
  if s.get('signature')!=signature:s={'signature':signature}
  # Complete a pending page chain before advancing since_id; interrupted runs retain the old lower bound.
  while client.calls<limit:
   params={'query':q,'max_results':10,'post.fields':'created_at,author_id,public_metrics,note_post,article'}
   if s.get('since_id'):params['since_id']=s['since_id']
   if s.get('next_token'):params['next_token']=s['next_token']
   try:
    response=client.fetch(params)
    if not isinstance(response,dict) or response.get('errors'):raise APIError('partial_or_error_response')
    data=response.get('data',[]);meta=response.get('meta') or {}
    if not isinstance(data,list) or not isinstance(meta,dict):raise APIError('invalid_response')
    high=int(s.get('pending_high','0'))
    for source in data[:10]:
     record=normalise(source,qid,now)
     if not record:continue
     high=max(high,int(record['id']));old=pending.get(record['id'])
     if old:record['query_ids']=sorted(set(old.get('query_ids',[])+[qid]))
     pending[record['id']]=record
    s['pending_high']=str(high);token=meta.get('next_token')
    if token:
     if not isinstance(token,str) or len(token)>2048:raise APIError('invalid_page_token')
     s['next_token']=token;s['status']='pending_pages'
    else:
     if high:s['since_id']=str(max(high,int(s.get('since_id','0'))))
     s.pop('next_token',None);s.pop('pending_high',None);s['status']='complete';s['completed_at']=now
    state['queries'][qid]=s
    if not token:break
   except APIError as e:
    if e.code=='http_400':s.pop('next_token',None) # Restart from the unchanged watermark next run.
    s['status']='error';state['queries'][qid]=s;fault=e;break
  done+=1
  if fault or client.calls>=limit:break
 state['cursor']=(cursor+done)%len(rows)
 all_items=sorted(pending.values(),key=lambda r:int(r['id']),reverse=True);state['items']=all_items[:2000];state['retention_limit']=2000;state['retention_removed_this_run']=max(0,len(all_items)-2000)
 state['last_error']=fault.code if fault else None
 state['next_check']=(instant+dt.timedelta(seconds=fault.delay if fault else 1800)).isoformat();state['generated_at']=now
 public.update(status='error' if fault else 'private_review',error=fault.code if fault else None,network_calls=client.calls,queued=len(state['items']),next_check=state['next_check'],retention_limit=2000,retention_removed_this_run=state['retention_removed_this_run'])
 return state,public

def private_write(path,data):
 path=Path(path);path.parent.mkdir(parents=True,exist_ok=True);os.chmod(path.parent,0o700)
 tmp=path.with_suffix('.tmp');fd=os.open(tmp,os.O_WRONLY|os.O_CREAT|os.O_TRUNC,0o600)
 with os.fdopen(fd,'w') as f:f.write(json.dumps(data,ensure_ascii=False,indent=2)+'\n')
 os.chmod(tmp,0o600);os.replace(tmp,path)

def main():
 p=argparse.ArgumentParser(description=__doc__);p.add_argument('--preset',default='all');p.add_argument('--query');p.add_argument('--allow-metered',action='store_true');p.add_argument('--max-requests',type=int,default=3);p.add_argument('--no-render',action='store_true');a=p.parse_args()
 try:rows=select(load(ROOT/'config/learning.json',{}),a.preset,a.query)
 except ValueError as e:p.exit(2,str(e)+'\n')
 token=os.environ.get('X_BEARER_TOKEN','');client=Client(token)
 private,public=collect(rows,load(ROOT/'.private/x-learning.json',{}),client,a.allow_metered,bool(token),a.max_requests)
 if a.allow_metered and token:private_write(ROOT/'.private/x-learning.json',private)
 (ROOT/'data/x-learning-health.json').write_text(json.dumps(public,ensure_ascii=False,indent=2)+'\n')
 if not a.no_render:update.write_site(load(ROOT/'data/feed.json',{}))
 print('X keyword collector:',public['status'],'requests:',public['network_calls'],'public post bodies: false')
if __name__=='__main__':main()
