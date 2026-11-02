#!/usr/bin/env python3
"""Index the PUBLIC Chen guide catalog: titles, category and links only; never gated bodies."""
import argparse, datetime as dt, hashlib, json, os, re, sys
from html.parser import HTMLParser
from pathlib import Path
from urllib import request, error
import update
from watch_sources import NoRedirect, WatchError, stamp, load
ROOT=Path(__file__).resolve().parents[1]
URL='https://chen.media/guides'
CAP=2*1024*1024
class CatalogParser(HTMLParser):
 def __init__(self):
  super().__init__(convert_charrefs=True);self.items={};self.card=None;self.h2=False;self.span=False;self.hidden=0
 def handle_starttag(self,tag,attrs):
  a=dict(attrs)
  if tag in ('script','style'):self.hidden+=1;return
  if self.hidden:return
  if tag=='a':
   href=a.get('href','')
   self.card={'url':'https://chen.media'+href,'title':'','category':''} if re.fullmatch(r'/guides/[a-z0-9][a-z0-9-]{1,200}',href) else None
  if self.card and tag=='h2':self.h2=True
  if self.card and tag=='span' and not self.card['category']:self.span=True
 def handle_data(self,data):
  if not self.card or self.hidden:return
  if self.h2:self.card['title']+=data
  elif self.span:self.card['category']+=data
 def handle_endtag(self,tag):
  if tag in ('script','style'):
   self.hidden=max(0,self.hidden-1);return
  if self.hidden:return
  if tag=='h2':self.h2=False
  if tag=='span':self.span=False
  if tag=='a' and self.card:
   r=self.card;title=' '.join(r['title'].split())[:240]
   if title:self.items[r['url']]={'id':'catalog-'+hashlib.sha256(r['url'].encode()).hexdigest()[:18], 'url':r['url'],'title':title,'category':' '.join(r['category'].split())[:80], 'basis':'catalog_metadata','source_name':'Chen Media','kind':'catalog'}
   self.card=None;self.h2=self.span=False

def parse_catalog(raw):
 if len(raw)>CAP:raise ValueError('body_limit')
 p=CatalogParser();p.feed(raw.decode('utf-8'));rows=list(p.items.values())
 if not rows:raise ValueError('no_public_catalog_cards')
 return rows[:800]
class Client:
 def __init__(self):self.calls=0;self.open=request.build_opener(NoRedirect())
 def fetch(self):
  update.validate_url(URL);self.calls+=1
  try:
   with self.open.open(request.Request(URL,headers={'User-Agent':'MotionRadar/9.0 (public catalog metadata)','Accept':'text/html','Accept-Encoding':'identity'}),timeout=25) as r:
    raw=r.read(CAP+1)
    if len(raw)>CAP:raise WatchError('body_limit')
    return raw
  except error.HTTPError as e:raise WatchError('http_'+str(e.code)) from None
  except (error.URLError,OSError,TimeoutError):raise WatchError('network') from None

def collect(previous,client,offline=False,now=None):
 now=now or stamp();instant=update.parse_date(now);next_at=update.parse_date(previous.get('next_check'))
 if offline or (next_at and instant<next_at):return {**previous,'generated_at':now,'status':'offline' if offline else ('backoff' if previous.get('status') in ('error','backoff') else 'cached'),'network_calls':0}
 result={**previous,'generated_at':now,'last_attempt':now,'source_url':URL,'mode':'public_catalog_metadata','network_calls':0}
 try:
  rows=parse_catalog(client.fetch());old={r['url']:r for r in previous.get('items',[])}
  for r in rows:r.update(first_seen=old.get(r['url'],{}).get('first_seen',now),observed_at=now)
  result.update(items=rows,status='ok',last_success=now,next_check=(instant+dt.timedelta(hours=24)).isoformat(),error=None)
 except (WatchError,ValueError,UnicodeError) as e:
  result.update(status='error',error=e.code if isinstance(e,WatchError) else 'invalid_public_catalog',next_check=(instant+dt.timedelta(hours=6)).isoformat())
 result['network_calls']=client.calls
 return result

def main():
 p=argparse.ArgumentParser(description=__doc__);p.add_argument('--offline',action='store_true');p.add_argument('--no-render',action='store_true');a=p.parse_args()
 result=collect(load(ROOT/'data/library.json',{}),Client(),a.offline);path=ROOT/'data/library.json';tmp=path.with_suffix('.tmp');tmp.write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n');os.replace(tmp,path)
 if not a.no_render:update.write_site(load(ROOT/'data/feed.json',{}))
 print('Public catalog:',result.get('status'),'titles:',len(result.get('items',[])),'network calls:',result['network_calls'])
if __name__=='__main__':main()
