import json,sys,tempfile,unittest,os,stat
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT/'scripts'))
import collect_library as c
import collect_x_learning as x
NOW='2026-11-02T10:00:00Z'
HTML=b'<a href="/guides/a-test"><div><span>Claude Code</span></div><h2>Claude &amp; YouTube</h2><p>HIDDEN BODY</p></a>'
CONF={'presets':[{'id':'one','x_query':'Claude skills'},{'id':'two','x_query':'Grok motion'}]}
class LibraryFake:
 def __init__(self,raw=HTML,exc=None):self.raw=raw;self.exc=exc;self.calls=0
 def fetch(self):
  self.calls+=1
  if self.exc:raise self.exc
  return self.raw
class XFake:
 def __init__(self,responses):self.responses=list(responses);self.calls=0;self.params=[]
 def fetch(self,p):
  self.params.append(p.copy());self.calls+=1;r=self.responses.pop(0)
  if isinstance(r,Exception):raise r
  return r
class LearningTests(unittest.TestCase):
 def test_only_public_catalog_metadata(self):
  r=c.parse_catalog(HTML)[0];self.assertEqual(r['title'],'Claude & YouTube');self.assertEqual(r['category'],'Claude Code');self.assertNotIn('HIDDEN BODY',json.dumps(r));self.assertEqual(r['basis'],'catalog_metadata')
 def test_no_scripts_gated_bodies(self):
  raw=b'<script>"<a href=\"/guides/hide\"><h2>SECRET</h2></a>"</script>'+HTML;self.assertEqual(len(c.parse_catalog(raw)),1)
 def test_origin_link_allowlist(self):
  self.assertEqual(len(c.parse_catalog(HTML+b'<a href="https://evil.org/a"><h2>Evil</h2></a><a href="/guides/../private"><h2>No</h2></a>')),1)
 def test_dedupe_catalog(self):self.assertEqual(len(c.parse_catalog(HTML*2)),1)
 def test_catalog_limit(self):
  raw=''.join(f'<a href="/guides/test-{i}"><h2>{i}</h2></a>' for i in range(900)).encode();self.assertEqual(len(c.parse_catalog(raw)),800)
 def test_catalog_too_large(self):
  with self.assertRaises(ValueError):c.parse_catalog(b'X'*(c.CAP+1))
 def test_empty_catalog_error(self):
  with self.assertRaises(ValueError):c.parse_catalog(b'<h1>Sign in</h1>')
 def test_library_live_and_cache(self):
  old=c.collect({},LibraryFake(),now=NOW);f=LibraryFake();r=c.collect(old,f,now=NOW);self.assertEqual(f.calls,0);self.assertEqual(r['status'],'cached');self.assertEqual(r['items'][0]['first_seen'],NOW)
 def test_library_error_preserves_previous(self):
  old=c.collect({},LibraryFake(),now=NOW);old['next_check']=None;f=LibraryFake(exc=c.WatchError('http_429'));r=c.collect(old,f,now=NOW);self.assertEqual(r['status'],'error');self.assertEqual(len(r['items']),1);r2=c.collect(r,LibraryFake(),now=NOW);self.assertEqual(r2['status'],'backoff')
 def test_offline_never_fetches(self):
  f=LibraryFake();c.collect({},f,offline=True,now=NOW);self.assertEqual(f.calls,0)
 def test_query_validation(self):
  for q in ['https://x.com/','hi\nnext','sk-'+'A'*35,'x', 'a'*141]:
   with self.assertRaises(ValueError):x.clean_keywords(q)
  self.assertEqual(x.clean_keywords('Claude animation'),'Claude animation')
 def test_preset_selection(self):
  self.assertEqual(len(x.select(CONF)),2);self.assertEqual(x.select(CONF,'one')[0]['id'],'one');self.assertTrue(x.select(CONF,query='Claude art')[0]['id'].startswith('custom-'))
  with self.assertRaises(ValueError):x.select(CONF,'missing')
 def test_key_and_cost_gates(self):
  for allowed,key,expected in [(False,False,'needs_key'),(False,True,'needs_consent'),(True,False,'needs_key')]:
   f=XFake([]);s,h=x.collect(x.select(CONF),{},f,allowed,key,now=NOW);self.assertEqual(f.calls,0);self.assertEqual(h['status'],expected);self.assertNotIn('text',json.dumps(h))
 def run_x(self,previous=None,responses=None,limit=3,rows=None):
  f=XFake(responses or [{'data':[],'meta':{}}]);s,h=x.collect(rows or x.select(CONF,'one'),previous or {},f,True,True,limit,now=NOW);return s,h,f
 def test_post_fields_and_window(self):
  s,h,f=self.run_x();self.assertIn('post.fields',f.params[0]);self.assertNotIn('tweet.fields',f.params[0]);self.assertEqual(f.params[0]['max_results'],10);self.assertEqual(h['window_days'],7)
 def test_pending_chain_no_premature_watermark(self):
  first={'data':[{'id':'11','text':'a'}],'meta':{'next_token':'page-2'}};s,h,f=self.run_x(responses=[first],limit=1);self.assertNotIn('since_id',s['queries']['one']);self.assertEqual(s['queries']['one']['next_token'],'page-2')
  s['next_check']=None;s2,h2,f2=self.run_x(s,[{'data':[{'id':'10','text':'b'}],'meta':{}}]);self.assertEqual(f2.params[0]['next_token'],'page-2');self.assertEqual(s2['queries']['one']['since_id'],'11');self.assertNotIn('next_token',s2['queries']['one'])
 def test_since_id_on_next_poll(self):
  s,h,f=self.run_x(responses=[{'data':[{'id':'15','text':'a'}],'meta':{}}]);s['next_check']=None;s2,h2,f2=self.run_x(s);self.assertEqual(f2.params[0]['since_id'],'15')
 def test_changed_query_resets_cursor(self):
  s,h,f=self.run_x(responses=[{'data':[{'id':'15','text':'a'}],'meta':{}}]);s['next_check']=None;s2,h2,f2=self.run_x(s,rows=[{'id':'one','x_query':'New topic'}]);self.assertNotIn('since_id',f2.params[0])
 def test_http_errors_stop_global_and_backoff(self):
  for code in [401,402,403,429]:
   s,h,f=self.run_x(responses=[x.APIError('http_'+str(code))],rows=x.select(CONF));self.assertEqual(f.calls,1);self.assertEqual(h['status'],'error');self.assertEqual(h['error'],'http_'+str(code));f2=XFake([]);s2,h2=x.collect(x.select(CONF),s,f2,True,True,now=NOW);self.assertEqual(f2.calls,0);self.assertEqual(h2['status'],'backoff')
 def test_error_payload_not_exported(self):
  s,h,f=self.run_x(responses=[{'errors':[{'detail':'SENSITIVE'}],'data':[{'id':'5','text':'SECRET'}]}]);self.assertEqual(h['status'],'error');self.assertNotIn('SECRET',json.dumps(h));self.assertEqual(s['items'],[])
 def test_extended_text_article_scope(self):
  r=x.normalise({'id':'7','text':'short','note_post':{'text':'full text'},'article':{'id':'a','title':'Title','body':'DO NOT MIRROR'}},'one',NOW);self.assertEqual(r['text'],'full text');self.assertEqual(r['coverage'],'expanded_text');self.assertNotIn('body',r['article']);self.assertEqual(x.normalise({'id':'8','text':'link','article':{'id':'a'}},'one',NOW)['coverage'],'article_metadata_only')
 def test_malformed_records(self):
  for r in [None,{}, {'id':'https://evil','text':'a'},{'id':'9','text':{}}]:self.assertIsNone(x.normalise(r,'one',NOW))
 def test_dedupe_query_membership(self):
  s,h,f=self.run_x(responses=[{'data':[{'id':'7','text':'a'}],'meta':{}},{'data':[{'id':'7','text':'a'}],'meta':{}}],rows=x.select(CONF));self.assertEqual(len(s['items']),1);self.assertEqual(s['items'][0]['query_ids'],['one','two']);self.assertNotIn('text',h)
 def test_budget_and_rotation(self):
  s,h,f=self.run_x(responses=[{'data':[],'meta':{}}],rows=x.select(CONF),limit=1);self.assertEqual(f.calls,1);self.assertEqual(s['cursor'],1)
 def test_invalid_page_token_does_not_advance(self):
  s,h,f=self.run_x(responses=[{'data':[{'id':'8','text':'x'}],'meta':{'next_token':123}}]);self.assertEqual(h['status'],'error');self.assertNotIn('since_id',s['queries']['one'])
 def test_private_file_permissions(self):
  with tempfile.TemporaryDirectory() as t:
   p=Path(t)/'private/queue.json';x.private_write(p,{'items':[{'text':'private'}]});self.assertEqual(stat.S_IMODE(p.stat().st_mode),0o600);self.assertEqual(stat.S_IMODE(p.parent.stat().st_mode),0o700)
 def test_config_references(self):
  ids={r['id'] for r in json.loads((ROOT/'config/expert_research.json').read_text())};cfg=json.loads((ROOT/'config/learning.json').read_text());self.assertEqual(len(cfg['presets']),10)
  for p in cfg['presets']:self.assertTrue(set(p['expert_ids'])<=ids)
  for w in json.loads((ROOT/'config/learning_workflows.json').read_text()):self.assertTrue(set(w['resources'])<=ids);self.assertEqual(w['status'],'draft_not_production_tested')
 def test_no_social_bodies_in_public_payload(self):
  p=json.loads((ROOT/'data/feed.json').read_text());self.assertNotIn('items',p['x_learning_health']);self.assertFalse(p['x_learning_health']['public_post_bodies'])
if __name__=='__main__':unittest.main()
