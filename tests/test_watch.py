import importlib.util,json,sys,tempfile,unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'scripts'))
import watch_sources as w
import export_studio as e
NOW='2026-11-02T01:00:00Z'
GH={'id':'demo','platform':'github','label':'Demo','repo':'owner/repo','enabled':True,'mode':'commits'}
RAW=json.dumps([{'html_url':'https://github.com/owner/repo/commit/abc','commit':{'message':'A change\nmore','committer':{'date':'2026-11-01T00:00:00Z'}}}]).encode()
class Fake:
 def __init__(self,raw=RAW,exc=None):self.raw=raw;self.exc=exc;self.calls=0
 def fetch(self,url):
  self.calls+=1
  if self.exc:raise self.exc
  return self.raw
class WatchTests(unittest.TestCase):
 def run_collect(self,sources=None,prev=None,client=None,**kw):return w.collect({'sources':sources if sources is not None else [GH]},prev or {},client or Fake(),now=NOW,**kw)
 def test_github_url(self):self.assertEqual(w.url_for(GH),'https://api.github.com/repos/owner/repo/commits?per_page=5')
 def test_reject_bad_repo(self):
  for value in ['../repo','owner/../repo','https://x','o/r?q=x','o/.','o/..']:
   with self.assertRaises(ValueError):w.url_for({**GH,'repo':value})
 def test_reject_unreviewed_feed(self):
  for value in ['https://127.0.0.1/','https://example.com/feed']:
   with self.assertRaises(ValueError):w.url_for({'platform':'rss','feed':value})
 def test_channel_shape(self):
  with self.assertRaises(ValueError):w.url_for({'platform':'youtube','channel_id':'anything'})
 def test_disabled_no_calls(self):
  c=Fake();d=self.run_collect([{**GH,'enabled':False,'reason':'needs access'}],client=c);self.assertEqual(c.calls,0);self.assertEqual(d['sources'][0]['status'],'disabled')
 def test_metadata_not_claimed_read(self):
  d=self.run_collect();r=d['items'][0];self.assertEqual(r['basis'],'metadata_only');self.assertEqual(r['title'],'A change');self.assertIn('не разобраны',r['summary']);self.assertEqual(d['network_calls'],1)
 def test_cache_no_calls(self):
  old=self.run_collect();c=Fake();d=self.run_collect(prev=old,client=c);self.assertEqual(c.calls,0);self.assertEqual(d['sources'][0]['status'],'cached')
 def test_offline_no_calls(self):
  old=self.run_collect();c=Fake();d=self.run_collect(prev=old,client=c,offline=True);self.assertEqual(c.calls,0);self.assertEqual(d['sources'][0]['status'],'offline')
 def test_http_error_stale_and_backoff(self):
  old=self.run_collect();c=Fake(exc=w.WatchError('http_429'));d=self.run_collect(prev=old,client=c,force=True);self.assertEqual(d['sources'][0]['error'],'http_429');self.assertTrue(d['items'][0]['source_stale']);c2=Fake();d2=self.run_collect(prev=d,client=c2);self.assertEqual(c2.calls,0);self.assertEqual(d2['sources'][0]['status'],'backoff')
 def test_config_change_ignores_cache(self):
  old=self.run_collect();c=Fake();self.run_collect([{**GH,'repo':'owner/other'}],prev=old,client=c);self.assertEqual(c.calls,1)
 def test_stable_id_seen(self):
  old=self.run_collect();old['items'][0]['seen_at']='2026-10-01T00:00:00Z';d=self.run_collect(prev=old,force=True);self.assertEqual(d['items'][0]['id'],old['items'][0]['id']);self.assertEqual(d['items'][0]['seen_at'],'2026-10-01T00:00:00Z')
 def test_no_private_links(self):
  for u in ['https://127.0.0.1/','javascript:alert(1)','https://evil.com/x','http://github.com/o/r']:
   self.assertIsNone(w.allowed_link(u,'github'))
 def test_no_dtd(self):
  with self.assertRaises(ValueError):w.normalize({'platform':'rss'},b'<!DOCTYPE rss><rss/>',NOW)
 def test_yt_metadata_only(self):
  ch='UCN8yiJK6Fa48FVdjS7r459A';raw=f'<feed xmlns="http://www.w3.org/2005/Atom" xmlns:yt="http://www.youtube.com/xml/schemas/2015"><entry><title>Claude motion</title><yt:videoId>5NRAOnKc3c8</yt:videoId><yt:channelId>{ch}</yt:channelId></entry></feed>'.encode();s={'platform':'youtube','id':'yt','label':'YT','channel_id':ch};d=w.normalize(s,raw,NOW);self.assertEqual(len(d),1);self.assertEqual(d[0]['basis'],'metadata_only');self.assertIn('не разобраны',d[0]['summary'])
 def test_wrong_yt_channel(self):
  raw=b'<feed xmlns="http://www.w3.org/2005/Atom" xmlns:yt="http://www.youtube.com/xml/schemas/2015"><entry><title>Motion</title><yt:videoId>5NRAOnKc3c8</yt:videoId><yt:channelId>OTHER</yt:channelId></entry></feed>';self.assertEqual(w.normalize({'platform':'youtube','id':'yt','label':'YT','channel_id':'expected'},raw,NOW),[])
 def test_rss_filter_and_no_full_body(self):
  raw=b'<rss><channel><item><title>Claude motion</title><link>https://louisedesadeleer.substack.com/p/a</link><description>FULL BODY</description></item></channel></rss>';r=w.normalize({'platform':'rss','id':'l','label':'Louise','keywords':['motion']},raw,NOW)[0];self.assertNotIn('FULL BODY',json.dumps(r))
 def test_limit_five(self):
  rows=[{'html_url':f'https://github.com/o/r/releases/tag/{i}','name':str(i)} for i in range(10)];self.assertEqual(len(w.normalize({**GH,'mode':'releases'},json.dumps(rows).encode(),NOW)),5)
 def test_bad_json_status(self):
  d=self.run_collect(client=Fake(b'not JSON'));self.assertEqual(d['sources'][0]['error'],'invalid_response')
 def test_export_review_only(self):
  with tempfile.TemporaryDirectory() as t:
   dest=Path(t)/'new';n=e.build(dest);manifest=json.loads((dest/'manifest.json').read_text());self.assertGreater(n,5);self.assertFalse(manifest['automatic_import']);self.assertEqual(manifest['mode'],'review_only')
   import hashlib
   for f in manifest['files']:self.assertEqual(hashlib.sha256((dest/f['path']).read_bytes()).hexdigest(),f['sha256'])
   with self.assertRaises(ValueError):e.build(dest)
 def test_research_scopes(self):
  rows=json.loads((ROOT/'config/expert_research.json').read_text());self.assertGreaterEqual(len(rows),25)
  for r in rows:self.assertTrue(r['limits']);self.assertTrue(r['access']);self.assertTrue(r['takeaways']);self.assertTrue(r['url'].startswith('https://'))
if __name__=='__main__':unittest.main()
